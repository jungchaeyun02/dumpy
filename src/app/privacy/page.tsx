/**
 * 개인정보 처리방침 페이지
 */

export const metadata = {
  title: '개인정보 처리방침 - 덤피',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-cream py-12 px-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-ink mb-8">개인정보 처리방침</h1>

        <div className="space-y-8 text-ink/80">
          <section>
            <h2 className="text-lg font-bold text-ink mb-3">1. 수집하는 개인정보</h2>
            <p className="mb-2">덤피는 서비스 제공을 위해 최소한의 정보만 수집합니다.</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>로그인 식별자 (토스 식별 키 또는 카카오 식별자)</li>
              <li>이용자가 작성한 메모 본문</li>
              <li>서비스 이용 기록 (동의 시각, 가입 시각)</li>
            </ul>
            <p className="mt-3 text-sm text-ink/60">
              이름, 연락처, 생년월일, 이메일 등의 개인정보는 수집하지 않습니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-ink mb-3">2. 개인정보의 이용 목적</h2>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>메모 저장 및 자동 분류 서비스 제공</li>
              <li>이용자 식별 및 본인 확인</li>
              <li>서비스 개선을 위한 통계 분석 (익명화된 데이터)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-ink mb-3">3. 메모 본문의 처리</h2>
            <p className="mb-2">
              <strong>메모를 분류하려고 다른 회사에 보내지 않습니다.</strong> 분류는 덤피가 직접 합니다.
            </p>
            <p className="text-sm text-ink/60">
              현재 덤피는 규칙 기반 분류를 사용하며, 외부 AI 서비스를 호출하지 않습니다.
              향후 AI 분류 도입 시 별도로 안내드리겠습니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-ink mb-3">4. 개인정보의 보관 기간</h2>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>회원 탈퇴 시: <strong>즉시 완전 삭제</strong></li>
              <li>개별 메모 삭제 시: 30일 후 완전 삭제 (실수 복구 기간)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-ink mb-3">5. 개인정보의 제3자 제공</h2>
            <p>
              덤피는 이용자의 개인정보를 제3자에게 제공하지 않습니다.
              다만, 법령에 따라 요청이 있는 경우에는 예외로 합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-ink mb-3">6. 개인정보 처리 위탁</h2>
            <p className="mb-2">서비스 운영을 위해 다음 업체에 처리를 위탁합니다.</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>클라우드 서버: [호스팅 업체명]</li>
              <li>데이터베이스: [DB 업체명]</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-ink mb-3">7. 이용자의 권리</h2>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>언제든지 메모를 조회, 수정, 삭제할 수 있습니다</li>
              <li>언제든지 회원 탈퇴를 할 수 있습니다</li>
              <li>개인정보 관련 문의는 아래 연락처로 해주세요</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-ink mb-3">8. 만 14세 미만 아동</h2>
            <p>
              덤피는 만 14세 이상만 이용할 수 있습니다.
              만 14세 미만 아동의 개인정보는 수집하지 않습니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-ink mb-3">9. 개인정보 보호책임자</h2>
            <p>
              이메일: privacy@dumpy.app<br />
              문의 가능 시간: 평일 10:00~18:00
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-ink mb-3">10. 시행일</h2>
            <p>이 개인정보 처리방침은 2024년 1월 1일부터 시행됩니다.</p>
          </section>
        </div>

        <div className="mt-12 text-center">
          <a href="/" className="text-dumpy-orange hover:underline">← 덤피로 돌아가기</a>
        </div>
      </div>
    </div>
  );
}
