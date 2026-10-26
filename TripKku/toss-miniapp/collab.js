/* Realtime repository. Only loads Supabase when the owner configures a real project. */
export class Collaboration {
  constructor(config,onChange=()=>{}){this.config=config;this.onChange=onChange;this.client=null;this.user=null;this.channel=null;}
  get configured(){return Boolean(this.config.supabaseUrl&&this.config.supabasePublishableKey);}
  async init(){
    if(!this.configured)return false;
    // Static Github Pages build uses an ESM CDN. For App in Toss production, bundle this
    // dependency with Vite instead (see docs/TOSS.md).
    const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2?bundle');
    this.client=createClient(this.config.supabaseUrl,this.config.supabasePublishableKey,{
      auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
    });
    const {data:{session},error}=await this.client.auth.getSession();if(error)throw error;
    this.user=session?.user||null;
    this.client.auth.onAuthStateChange((_event,session)=>{
      const old=this.user?.id;this.user=session?.user||null;
      if(old!==this.user?.id)this.onChange('auth');
    });
    return true;
  }
  async signIn(provider){
    if(!this.client)throw Error('Supabase 연결 설정이 필요해요.');
    const {error}=await this.client.auth.signInWithOAuth({provider,options:{redirectTo:location.origin+location.pathname}});
    if(error)throw error;
  }
  async signOut(){if(this.client){const {error}=await this.client.auth.signOut();if(error)throw error;}this.user=null;}
  async trips(){
    const {data,error}=await this.client.from('trips').select('*').order('created_at',{ascending:false});
    if(error)throw error;return data||[];
  }
  async readTrip(id){
    const sup=this.client;
    const [tr,mem,fin,exp,it]=await Promise.all([
      sup.from('trips').select('*').eq('id',id).single(),
      sup.from('trip_members').select('trip_id,user_id,nickname,role').eq('trip_id',id),
      sup.from('member_finances').select('personal_target,airfare,personal_extra').eq('trip_id',id).eq('user_id',this.user.id).single(),
      sup.from('shared_expenses').select('*').eq('trip_id',id).order('created_at'),
      sup.from('plan_items').select('*').eq('trip_id',id).order('day_number').order('created_at')
    ]);
    for(const res of [tr,mem,fin,exp,it])if(res.error)throw res.error;
    return {trip:tr.data,members:mem.data||[],finance:fin.data,expenses:exp.data||[],items:it.data||[]};
  }
  async createTrip(preset){
    const t={owner_id:this.user.id,preset:preset.key,title:preset.title,city:preset.city,dates:preset.dates,
      language:preset.language,description:preset.description||'',budget_note:preset.budgetNote||'',
      shared_target:preset.shared_target,active_plan:preset.plan,nights_a:preset.nights_a,nights_b:preset.nights_b};
    const {data,error}=await this.client.from('trips').insert(t).select('id').single();if(error)throw error;
    const id=data.id;
    if(preset.expenses?.length){
      const {error:e}=await this.client.from('shared_expenses').insert(preset.expenses.map(x=>({...x,trip_id:id,created_by:this.user.id})));
      if(e)throw Error('여행 생성됨. 초기 경비 저장 실패: '+e.message);
    }
    const events=Object.entries(preset.schedule||{}).flatMap(([key,items])=>items.map(x=>({trip_id:id,plan_key:key,day_number:x.day,time_label:x.time,title:x.title,note:x.note,created_by:this.user.id})));
    if(events.length){const {error:e}=await this.client.from('plan_items').insert(events);if(e)throw Error('여행 생성됨. 초기 일정 저장 실패: '+e.message);}
    return id;
  }
  async updateTrip(id,patch){const {error}=await this.client.from('trips').update(patch).eq('id',id);if(error)throw error;}
  async updateFinance(id,patch){const {error}=await this.client.from('member_finances').update(patch).eq('trip_id',id).eq('user_id',this.user.id);if(error)throw error;}
  async addExpense(id,x){const {error}=await this.client.from('shared_expenses').insert({...x,trip_id:id,created_by:this.user.id});if(error)throw error;}
  async deleteExpense(id){const {error}=await this.client.from('shared_expenses').delete().eq('id',id);if(error)throw error;}
  async addItem(tripId,item){const {error}=await this.client.from('plan_items').insert({...item,trip_id:tripId,created_by:this.user.id});if(error)throw error;}
  async updateItem(id,patch){const {error}=await this.client.from('plan_items').update(patch).eq('id',id);if(error)throw error;}
  async deleteItem(id){const {error}=await this.client.from('plan_items').delete().eq('id',id);if(error)throw error;}
  async setNickname(tripId,nickname){
    const {error}=await this.client.from('trip_members').update({nickname}).eq('trip_id',tripId).eq('user_id',this.user.id);
    if(error)throw error;
  }
  async invite(tripId){const {data,error}=await this.client.rpc('create_trip_invite',{p_trip:tripId});if(error)throw error;return data;}
  async join(token){const {data,error}=await this.client.rpc('join_trip',{p_token:token});if(error)throw error;return data;}
  subscribe(id){
    if(!this.client)return;
    if(this.channel){this.client.removeChannel(this.channel);this.channel=null;}
    const tables=[['trips','id'],['trip_members','trip_id'],['member_finances','trip_id'],['shared_expenses','trip_id'],['plan_items','trip_id']];
    let ch=this.client.channel('tripkku-'+id);
    for(const [table,column] of tables)ch=ch.on('postgres_changes',{
      event:'*',schema:'public',table,filter:column+'=eq.'+id
    },()=>this.onChange('realtime'));
    this.channel=ch.subscribe();
  }
}
