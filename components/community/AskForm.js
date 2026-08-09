'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Button from '@/components/ds/Button';
import { Alert } from '@/components/ds/Feedback';
import { Field, Select, TextArea } from './Field';
import { TOPIC_OPTIONS } from './topics';
import { postJson } from './client';

/**
 * Ask a question about a listing.
 *
 * Asking does not require living there, which is the point. Answering does.
 *
 * The topic select is an addition to the frame, which draws only the question
 * box. The six segment coverage strip above the page cannot fill in without
 * knowing which of the six a question belongs to, and guessing from the words
 * would light up segments on a keyword match. Asking once, in a control the
 * student can see, is more honest than inferring it silently.
 */
export default function AskForm({ hostelSlug, signedIn, signInHref }) {
  const router = useRouter();
  const [question, setQuestion] = useState('');
  const [topic, setTopic] = useState('other');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [existing, setExisting] = useState(null);
  const [done, setDone] = useState(false);

  if (!signedIn) {
    return (
      <div className="flex flex-col gap-3">
        <Alert title="Sign in to ask a question">
          A question is attached to your account so residents can see who is asking.
          Your surname is never shown in full.
        </Alert>
        <div className="flex">
          <Button href={signInHref}>Sign in to ask</Button>
        </div>
      </div>
    );
  }

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setExisting(null);
    setDone(false);

    try {
      await postJson('/api/community/threads', { hostelSlug, question, topic });
      setQuestion('');
      setTopic('other');
      setDone(true);
      router.refresh();
    } catch (err) {
      setError(err.message);
      if (err.href) setExisting(err.href);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Field
        id="ask-question"
        label="Ask your own question"
        required
        hint="One clear question gets answered. A list of six does not."
        error={error}
      >
        <TextArea
          id="ask-question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={200}
          required
          rows={3}
          placeholder="Is there space to keep a bicycle inside the gate?"
        />
      </Field>

      {existing ? (
        <p className="ds-body-s text-ds-ink-muted">
          <Link href={existing} className="ds-focusable text-ds-cobalt underline underline-offset-2">
            Read the question that is already there
          </Link>
        </p>
      ) : null}

      <Field
        id="ask-topic"
        label="Which of the six is it about"
        required
        hint="This is what fills in the coverage strip at the top of the page."
      >
        <Select
          id="ask-topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          options={TOPIC_OPTIONS}
        />
      </Field>

      {done ? <Alert title="Asked">Residents can see it now and answer when they can.</Alert> : null}

      <Button type="submit" loading={busy} className="w-full">
        Ask this question
      </Button>
    </form>
  );
}
