/**
 * 이용약관 페이지
 */

export const metadata = {
  title: '이용약관 - 덤피',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-cream py-12 px-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-ink mb-8">이용약관</h1>

        <div className="space-y-8 text-ink/80">
          <section>
            <h2 className="text-lg font-bold text-ink mb-3">제1조 (목적)</h2>
            <p>
              이 약관은 덤피(이하 &quot;서비스&quot;)의 이용 조건 및 절차,
              이용자와 서비스 제공자의 권리, 의무, 책임사항 등을 규정함을 목적으로 합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-ink mb-3">제2조 (서비스의 내용)</h2>
            <p className="mb-2">덤피는 다음과 같은 서비스를 제공합니다.</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>메모 저장 및 관리</li>
              <li>메모 자동 분류 (할 일, 일기, 모아둔 것, 그 외)</li>
              <li>분류된 메모 조회</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-ink mb-3">제3조 (이용 자격)</h2>
            <p>
              서비스는 만 14세 이상인 자만 이용할 수 있습니다.
              이용자는 가입 시 만 14세 이상임을 확인해야 합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-ink mb-3">제4조 (이용자의 의무)</h2>
            <p className="mb-2">이용자는 다음 행위를 해서는 안 됩니다.</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>타인의 정보를 도용하는 행위</li>
              <li>서비스의 운영을 방해하는 행위</li>
              <li>서비스를 이용하여 법령에 위반되는 행위</li>
              <li>자동화된 수단을 이용하여 서비스에 부하를 주는 행위</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-ink mb-3">제5조 (서비스의 중단)</h2>
            <p>
              서비스 제공자는 시스템 점검, 장애 복구 등의 사유로 서비스를 일시 중단할 수 있습니다.
              이 경우 사전에 공지하며, 부득이한 경우 사후에 공지할 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-ink mb-3">제6조 (메모의 보관)</h2>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>이용자가 삭제한 메모는 30일간 보관 후 완전히 삭제됩니다</li>
              <li>회원 탈퇴 시 모든 메모는 즉시 완전히 삭제됩니다</li>
              <li>삭제된 메모는 복구할 수 없습니다</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-ink mb-3">제7조 (면책조항)</h2>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>천재지변, 시스템 장애 등 불가항력으로 인한 서비스 중단에 대해 책임지지 않습니다</li>
              <li>이용자가 작성한 메모의 내용에 대해 책임지지 않습니다</li>
              <li>자동 분류의 정확성을 보장하지 않습니다. 이용자는 분류를 직접 수정할 수 있습니다</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-ink mb-3">제8조 (약관의 변경)</h2>
            <p>
              약관을 변경할 경우 시행일 7일 전에 공지합니다.
              이용자에게 불리한 변경의 경우 30일 전에 공지합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-ink mb-3">제9조 (분쟁 해결)</h2>
            <p>
              서비스 이용으로 발생한 분쟁에 대해 서비스 제공자와 이용자는 성실히 협의하여 해결합니다.
              협의가 이루어지지 않을 경우 관련 법령에 따릅니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-ink mb-3">부칙</h2>
            <p>이 약관은 2024년 1월 1일부터 시행됩니다.</p>
          </section>
        </div>

        <div className="mt-12 text-center">
          <a href="/" className="text-dumpy-orange hover:underline">← 덤피로 돌아가기</a>
        </div>
      </div>
    </div>
  );
}
