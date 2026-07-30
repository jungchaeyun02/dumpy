'use client';

/**
 * 자체 로그인 폼 — 아이디·비밀번호
 *
 * 카카오 없이도 들어올 수 있는 길. 로그인과 만들기를 한 폼에서 전환한다.
 * 화면이 처음 열릴 때는 접혀 있다 — 카카오 버튼이 주된 길이고,
 * 이건 그게 싫거나 안 될 때 쓰는 쪽이라 시선을 나눠 가지지 않게 한다.
 *
 * 검증은 화면에서도 하지만 그건 예의고, 막는 건 서버다.
 * (validation.ts 의 같은 규칙을 API 가 다시 확인한다)
 */

import { useState } from 'react';
import { messages } from '@/lib/utils/messages';
import {
  USERNAME_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
} from '@/lib/utils/constants';

const copy = messages.localAuth;

type Mode = 'login' | 'signup';

export function LocalAuthForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSignup = mode === 'signup';

  // 모드를 바꿀 때 오류만 지운다. 입력값은 남겨둔다 —
  // 로그인이 안 돼서 만들기로 넘어가는 흐름에서 다시 타이핑하게 만들 이유가 없다.
  const switchMode = () => {
    setMode(isSignup ? 'login' : 'signup');
    setError(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/auth/local/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data?.success) {
        // 새로고침으로 서버가 내려주는 로그인 상태를 그대로 받는다
        window.location.reload();
        return;
      }

      setError(data?.error ?? copy.failed);
    } catch {
      setError(copy.failed);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return (
      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="link-quiet text-meta"
        >
          {copy.loginTitle}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-6">
      {/* 구분선 — 카카오와 여기 사이를 갈라준다 */}
      <div className="flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-line" />
        <span className="text-meta text-muted">{copy.divider}</span>
        <span className="h-px flex-1 bg-line" />
      </div>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
        <h2 className="text-body font-bold text-ink">
          {isSignup ? copy.signupTitle : copy.loginTitle}
        </h2>

        <div className="flex flex-col gap-1">
          <label htmlFor="dumpy-username" className="text-meta text-muted">
            {copy.usernameLabel}
          </label>
          <input
            id="dumpy-username"
            name="username"
            type="text"
            className="field px-4 py-3"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={copy.usernamePlaceholder}
            maxLength={USERNAME_MAX_LENGTH}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
            disabled={isSubmitting}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="dumpy-password" className="text-meta text-muted">
            {copy.passwordLabel}
          </label>
          <input
            id="dumpy-password"
            name="password"
            type="password"
            className="field px-4 py-3"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={copy.passwordPlaceholder}
            maxLength={PASSWORD_MAX_LENGTH}
            // 브라우저 비밀번호 관리자에게 '새 비밀번호'인지 알려준다
            autoComplete={isSignup ? 'new-password' : 'current-password'}
            required
            disabled={isSubmitting}
          />
        </div>

        {/* 되찾을 방법이 없다는 건 만들기 전에 알려야 한다 */}
        {isSignup && (
          <p className="text-meta text-muted leading-[1.6]">{copy.noRecoveryNotice}</p>
        )}

        {/* role="alert" 로 읽어주는 화면에서도 오류가 전달되게 */}
        {error && (
          <p role="alert" className="text-meta text-dumpy-orange leading-[1.6]">
            {error}
          </p>
        )}

        <button type="submit" className="btn-primary py-3" disabled={isSubmitting}>
          {isSignup ? copy.signupButton : copy.loginButton}
        </button>

        <p className="text-center">
          <button type="button" onClick={switchMode} className="link-quiet text-meta">
            {isSignup ? copy.toLogin : copy.toSignup}
          </button>
        </p>
      </form>
    </div>
  );
}
