/**
 * 로그인 화면 4칸 미리보기
 *
 * 동작하지 않는 정지 화면이다. 앱이 뭘 하는지 보여주기만 한다.
 * - 상태도 이벤트도 없다 (클라이언트 컴포넌트가 아니어도 된다)
 * - pointer-events-none 으로 클릭·호버 반응을 완전히 막는다
 *   ('.card' / '.tile' 클래스를 쓰지 않는 이유도 같다 - 그쪽엔 hover 시
 *    떠오르는 애니메이션이 걸려 있다)
 * - aria-hidden: 가짜 메모라서 읽어주면 실제 내용으로 오해된다.
 *   이 앱이 뭔지는 위쪽 대표 문구가 이미 설명한다.
 */

// 카카오 버튼처럼 이 화면에서만 쓰는 값이라 토큰으로 빼지 않는다
const CELL_BORDER = '#EFE6D6';
const BLOCK_FILL = '#EFEBE3';

function Cell({
  emoji,
  title,
  children,
}: {
  emoji: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl bg-paper p-3"
      style={{ border: `1px solid ${CELL_BORDER}` }}
    >
      <div className="flex items-center gap-1 mb-2">
        <span className="text-[12px] sm:text-[13px] leading-none">{emoji}</span>
        <span className="text-[12px] sm:text-[13px] font-bold text-ink leading-none">
          {title}
        </span>
      </div>
      <div className="space-y-1 text-[11px] sm:text-[12px] text-muted leading-snug">
        {children}
      </div>
    </div>
  );
}

// 빈 체크박스
function Box() {
  return (
    <span
      className="mt-[3px] w-3 h-3 shrink-0 rounded-[3px]"
      style={{ border: `1px solid ${CELL_BORDER}` }}
    />
  );
}

function TodoLine({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-1">
      <Box />
      <span className="flex-1 truncate">{children}</span>
    </div>
  );
}

export function LoginPreview() {
  return (
    <div
      aria-hidden="true"
      className="w-full grid grid-cols-2 gap-3 opacity-70 pointer-events-none select-none"
    >
      <Cell emoji="🥕" title="할 일">
        <TodoLine>내일까지 과제 제출</TodoLine>
        <TodoLine>우산 사기</TodoLine>
      </Cell>

      <Cell emoji="📔" title="일기">
        <div className="font-medium">07.29</div>
        <div className="truncate">오늘 비 왔다...</div>
      </Cell>

      <Cell emoji="🌰" title="모아둔 것">
        {/* 카드 모양만 - 내용 없음 */}
        <div className="grid grid-cols-2 gap-1">
          <div className="h-6 rounded-[6px]" style={{ backgroundColor: BLOCK_FILL }} />
          <div className="h-6 rounded-[6px]" style={{ backgroundColor: BLOCK_FILL }} />
        </div>
      </Cell>

      <Cell emoji="🧺" title="그 외">
        <div className="flex items-start gap-1">
          <span>·</span>
          <span className="flex-1 truncate">동아리 회비 3만원</span>
        </div>
      </Cell>
    </div>
  );
}
