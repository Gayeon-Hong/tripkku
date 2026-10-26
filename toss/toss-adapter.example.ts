// EXAMPLE ONLY. Do not invoke this from the public GitHub Pages build.
// Requires npm install @apps-in-toss/web-framework and a secure operator-owned server.
import { TossAuth, Share, Device } from '@apps-in-toss/web-framework';

export async function tossLoginWithServer(serverOrigin: string) {
  const { authorizationCode, referrer } = await TossAuth.login();
  const response = await fetch(`${serverOrigin}/toss/session`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ authorizationCode, referrer }),
    credentials: 'include',
  });
  if (!response.ok) throw new Error('토스 로그인 서버 인증 실패');
  // The trusted server verifies the code with Toss API and establishes secure session.
  // NEVER accept a caller-supplied arbitrary user_id as identity.
  return await response.json();
}
export async function createTossInviteLink(appName: string, inviteToken: string) {
  const path=`intoss://${appName}?invite=${encodeURIComponent(inviteToken)}`;
  return Share.createLink({path});
}
export async function openApprovedExternalUrl(url: string) {
  // Call only after explicit policy review. Some external flows may be prohibited.
  return Device.openURL(url);
}
