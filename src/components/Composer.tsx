"use client";

import { useRef, useState, useTransition } from "react";

type ComposerProps = {
  chatId?: string;
  action: (formData: FormData) => void | Promise<void>;
  placeholder: string;
  disabledAfterSubmit?: boolean;
  onOptimistic?: (content: string) => void;
};

export function Composer({ chatId, action, placeholder, disabledAfterSubmit = false, onOptimistic }: ComposerProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const [locked, setLocked] = useState(false);
  const [isPending, startTransition] = useTransition();
  const disabled = locked || isPending;

  function submit(formData: FormData) {
    const value = String(formData.get("content") ?? "").trim();
    if (!value || disabled) return;
    if (disabledAfterSubmit) setLocked(true);
    textRef.current!.value = "";
    onOptimistic?.(value);
    startTransition(async () => {
      await action(formData);
      if (!disabledAfterSubmit) setLocked(false);
    });
  }

  return (
    <form ref={formRef} className="composer-wrap" action={submit}>
      {chatId ? <input type="hidden" name="chatId" value={chatId} /> : null}
      <div className="composer">
        <textarea
          ref={textRef}
          name="content"
          placeholder={placeholder}
          required
          disabled={disabled}
          onKeyDown={event => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              if (!disabled) formRef.current?.requestSubmit();
            }
          }}
        />
        <button className="btn" type="submit" disabled={disabled}>{disabled ? "..." : "Send"}</button>
      </div>
    </form>
  );
}
