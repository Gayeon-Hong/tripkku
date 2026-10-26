// Toss Design System integration sample (React island on the existing vanilla UI).
// A full non-game miniapp should migrate the remaining interactions to TDS.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { TDSMobileAITProvider } from '@toss/tds-mobile-ait';
import { Button } from '@toss/tds-mobile';

function go(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function QuickActions() {
  return <TDSMobileAITProvider>
    <div className="tds-note">앱인토스 테스트용 · 토스 디자인 시스템 버튼</div>
    <div className="tds-buttons">
      <Button size="small" color="primary" variant="weak" onClick={() => go('plans')}>여행 일정</Button>
      <Button size="small" color="primary" variant="weak" onClick={() => go('budget')}>여행 예산</Button>
      <Button size="small" color="primary" variant="weak" onClick={() => go('assistant')}>대화 편집</Button>
    </div>
  </TDSMobileAITProvider>;
}
const mount = document.getElementById('toss-tds-actions');
if (mount) createRoot(mount).render(<QuickActions />);
