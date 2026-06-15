"use client";

import { useRef, useState, useTransition } from "react";

type ComposerProps = {
  placeholder: string;
  disabledAfterSubmit?: boolean;
  onSubmitContent: (content: string) => void | Promise<void>;
};

export function Composer({ placeholder, disabledAfterSubmit = false, onSubmitContent }: ComposerProps) {
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
    startTransition(async () => {
      await onSubmitContent(value);
      if (!disabledAfterSubmit) setLocked(false);
    });
  }

  return (
    <form ref={formRef} className="composer-wrap" action={submit}>
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
