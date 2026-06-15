"use client";

import { useRef } from "react";

type ComposerProps = {
  chatId?: string;
  action: (formData: FormData) => void | Promise<void>;
  placeholder: string;
};

export function Composer({ chatId, action, placeholder }: ComposerProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  return (
    <form
      ref={formRef}
      className="composer-wrap"
      action={async formData => {
        const value = String(formData.get("content") ?? "").trim();
        if (!value) return;
        textRef.current!.value = "";
        await action(formData);
      }}
    >
      {chatId ? <input type="hidden" name="chatId" value={chatId} /> : null}
      <div className="composer">
        <textarea
          ref={textRef}
          name="content"
          placeholder={placeholder}
          required
          onKeyDown={event => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              formRef.current?.requestSubmit();
            }
          }}
        />
        <button className="btn" type="submit">Send</button>
      </div>
    </form>
  );
}
