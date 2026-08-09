'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ds/Button';
import { Alert } from '@/components/ds/Feedback';
import { Field, TextArea } from './Field';
import { postJson } from './client';

/**
 * Answer a question, if you live there.
 *
 * The form is not rendered at all for somebody who does not, and the route
 * refuses the write regardless, so hiding it is a courtesy rather than the
 * control. What is rendered instead is the reason, because "you cannot do
 * this" with no explanation reads as a broken page.
 */
export default function AnswerForm({ threadId, canAnswer, reason }) {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  if (!canAnswer) {
    return <Alert title="Only residents answer">{reason}</Alert>;
  }

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await postJson(`/api/community/threads/${threadId}/answers`, { body });
      setBody('');
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Field
        id="answer-body"
        label="Answer this"
        required
        hint="Say what it is actually like. Somebody reads this instead of asking again."
        error={error}
      >
        <TextArea
          id="answer-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={1200}
          required
          rows={4}
          placeholder="Fine on the second floor. On the third it drops after 8pm."
        />
      </Field>

      <div className="flex">
        <Button type="submit" loading={busy}>
          Post this answer
        </Button>
      </div>
    </form>
  );
}
