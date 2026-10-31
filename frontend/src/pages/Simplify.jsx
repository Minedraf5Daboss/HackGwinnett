import { useState } from 'react';
import { api } from '../api.js';
import { Alert, Button, Card, Field } from '../components/ui.jsx';

const EXAMPLE =
  'You have hypertension and mild dyspnea. Take an analgesic BID for arthralgia. ' +
  'Call us if you notice edema.';

export default function Simplify() {
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [working, setWorking] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setWorking(true);
    setError(null);
    try {
      setResult(await api('/simplify', { method: 'POST', body: { text } }));
    } catch (err) {
      setError(err.message);
      setResult(null);
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Plain-language helper</h1>
        <p className="mt-1 text-slate-600">
          Paste text from a visit summary, prescription, or test result. We'll swap medical jargon
          for everyday words.
        </p>
      </div>

      <Card as="form" onSubmit={handleSubmit} className="space-y-4">
        <Field
          label="Medical text"
          name="text"
          multiline
          rows={6}
          maxLength={5000}
          required
          value={text}
          onChange={(event) => setText(event.target.value)}
          hint={`${text.length} of 5,000 characters`}
        />
        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={working || !text.trim()}>
            {working ? 'Simplifying…' : 'Simplify'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setText(EXAMPLE);
              setResult(null);
            }}
          >
            Try an example
          </Button>
        </div>
        {error && <Alert>{error}</Alert>}
      </Card>

      {result && (
        <Card aria-live="polite">
          <h2 className="text-lg font-semibold">In plain language</h2>
          <p className="mt-2 text-lg whitespace-pre-line">{result.simplified}</p>

          {result.terms.length > 0 ? (
            <>
              <h3 className="mt-6 font-semibold">Words we changed</h3>
              <dl className="mt-2 divide-y divide-slate-100 text-sm">
                {result.terms.map((term) => (
                  <div key={term.term} className="flex justify-between gap-4 py-2">
                    <dt className="font-medium">{term.term}</dt>
                    <dd className="text-right text-slate-700">{term.plain}</dd>
                  </div>
                ))}
              </dl>
            </>
          ) : (
            <p className="mt-4 text-sm text-slate-600">
              We didn't find any medical terms we know, so nothing was changed.
            </p>
          )}

          <p className="mt-4 text-sm text-slate-500">
            This swaps known words one for one and doesn't check the meaning. If anything is
            unclear, ask your care team.
          </p>
        </Card>
      )}
    </div>
  );
}
