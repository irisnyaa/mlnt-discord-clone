"use client";

import { useRef, useState } from "react";

type ComposerProps = {
  placeholder: string;
  disabledAfterSubmit?: boolean;
  onSubmitContent: (content: string) => void | Promise<void>;
};

export function Composer({ placeholder, disabledAfterSubmit = false, onSubmitContent }: ComposerProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const disabled = submitting;

  function submit(formData: FormData) {
    const value = String(formData.get("content") ?? "").trim();
    if (!value || disabled) return;

    textRef.current!.value = "";
    if (disabledAfterSubmit) setSubmitting(true);

    // Important: do not wrap this in useTransition. Optimistic chat updates must
    // render synchronously before the slow model/network work starts.
    void Promise.resolve(onSubmitContent(value)).finally(() => {
      if (!disabledAfterSubmit) setSubmitting(false);
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
