import { ArrowRight, BookOpenText, Sparkles, WandSparkles } from 'lucide-react';
import { useState } from 'react';
import { api } from '../api.js';
import { Alert, Button, Card, IconTile, PageHeader, inputClass } from '../components/ui.jsx';

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
    <div className="space-y-8">
      <PageHeader icon={BookOpenText} title="Plain-language helper">
        Paste text from a visit summary, prescription, or test result. We'll swap medical jargon for
        everyday words.
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <Card as="form" onSubmit={handleSubmit} padded={false} className="overflow-hidden">
          <div className="p-6 pb-4">
            <label htmlFor="text" className="block text-sm font-medium text-slate-700">
              Medical text
            </label>
            <textarea
              id="text"
              rows={10}
              maxLength={5000}
              required
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="e.g. Take an analgesic BID for arthralgia."
              className={`mt-1.5 resize-y ${inputClass}`}
            />
            <p className="mt-1.5 text-right text-xs text-slate-400">
              {text.length.toLocaleString()} / 5,000
            </p>
            {error && (
              <div className="mt-3">
                <Alert>{error}</Alert>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 bg-slate-50/60 px-6 py-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setText(EXAMPLE);
                setResult(null);
              }}
            >
              Try an example
            </Button>
            <Button type="submit" disabled={working || !text.trim()} className="ml-auto">
              <Sparkles aria-hidden="true" />
              {working ? 'Simplifying…' : 'Simplify'}
            </Button>
          </div>
        </Card>

        <Card aria-live="polite" className="lg:sticky lg:top-24">
          {result ? (
            <div className="motion-safe:animate-fade-up">
              <h2 className="flex items-center gap-2 font-semibold">
                <Sparkles aria-hidden="true" className="h-5 w-5 text-teal-700" />
                In plain language
              </h2>
              <p className="mt-3 text-lg leading-relaxed whitespace-pre-line">
                <Highlighted text={result.simplified} terms={result.terms} />
              </p>

              {result.terms.length > 0 ? (
                <>
                  <h3 className="mt-6 text-sm font-semibold tracking-wide text-slate-500 uppercase">
                    Words we changed
                  </h3>
                  <dl className="mt-2 divide-y divide-slate-100 text-sm">
                    {result.terms.map((term) => (
                      <div key={term.term} className="flex items-center justify-between gap-4 py-2">
                        <dt className="font-mono text-slate-500">{term.term}</dt>
                        <dd className="flex items-center gap-2 text-right font-medium text-slate-900">
                          <ArrowRight aria-hidden="true" className="h-4 w-4 text-teal-600" />
                          {term.plain}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </>
              ) : (
                <p className="mt-4 text-sm text-slate-600">
                  We didn't find any medical terms we know, so nothing was changed.
                </p>
              )}

              <p className="mt-6 rounded-xl bg-slate-50 px-3.5 py-2.5 text-xs text-slate-500">
                This swaps known words one for one and doesn't check the meaning. If anything is
                unclear, ask your care team.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center rounded-xl border-2 border-dashed border-slate-200 px-6 py-14 text-center">
              <IconTile icon={WandSparkles} size="lg" />
              <p className="mt-4 font-medium text-slate-700">Your plain-language version</p>
              <p className="mt-1 text-sm text-slate-500">
                It shows up here, with the words we changed highlighted.
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

/** The simplified text, with the words we put in highlighted. Hover one to see the original. */
function Highlighted({ text, terms }) {
  if (terms.length === 0) return text;
  const originals = new Map(terms.map((t) => [t.plain.toLowerCase(), t.term]));
  const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const alternatives = [...originals.keys()].sort((a, b) => b.length - a.length).map(escape);
  // With a capture group, split() keeps the matches: every odd part is a replaced phrase.
  const parts = text.split(new RegExp(`(${alternatives.join('|')})`, 'gi'));
  return parts.map((part, index) =>
    index % 2 ? (
      <mark
        key={index}
        title={`Was "${originals.get(part.toLowerCase())}"`}
        className="rounded-md bg-teal-100 px-1 text-teal-950"
      >
        {part}
      </mark>
    ) : (
      part
    ),
  );
}
