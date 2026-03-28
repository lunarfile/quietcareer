'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { StepIndicator } from '@/components/ui/step-indicator';
import { setSetting } from '@/lib/settings';
import { db } from '@/lib/db';
import { generateId, now, todayISO } from '@/lib/utils';
import { streamAIResponse, type AIProvider } from '@/lib/ai/providers';
import { rewriteAsImpact } from '@/lib/ai/prompts';
import { getAIApiKey, getAIProvider, getAIModel } from '@/lib/settings';
import { encryptWorkLog } from '@/lib/field-encryption';
import { ArrowDown, Sparkles, ArrowRight, Check } from 'lucide-react';

type Step = 'profile' | 'magic';

const ROLE_SUGGESTIONS = [
  'Software Engineer',
  'Product Manager',
  'Marketing Manager',
  'Sales Rep',
  'Designer',
  'Operations',
  'Finance',
  'HR / People',
  'Data Scientist',
  'Consultant',
  'Project Manager',
  'Executive',
];

const CONCERNS = [
  { id: 'layoff', label: 'I might get laid off', emoji: '\u{1F6A8}' },
  { id: 'promotion', label: 'I want a promotion', emoji: '\u{1F4C8}' },
  { id: 'burnout', label: "I'm burning out", emoji: '\u{1F6CF}\u{FE0F}' },
  { id: 'quit', label: 'I want to quit eventually', emoji: '\u{1F6AA}' },
  { id: 'organized', label: 'I just want to stay organized', emoji: '\u{1F4CB}' },
];

const TENURE_OPTIONS = ['< 1 year', '1\u20133 years', '3\u20135 years', '5+ years'];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('profile');
  const [transitioning, setTransitioning] = useState(false);

  // Profile state
  const [role, setRole] = useState('');
  const [tenure, setTenure] = useState('');
  const [concerns, setConcerns] = useState<string[]>([]);

  // Magic moment state
  const [workEntry, setWorkEntry] = useState('');
  const [aiRewrite, setAiRewrite] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const toggleConcern = (id: string) => {
    setConcerns((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const transitionTo = useCallback((nextStep: Step) => {
    setTransitioning(true);
    setTimeout(() => {
      setStep(nextStep);
      setTransitioning(false);
    }, 300);
  }, []);

  const handleProfileSubmit = async () => {
    await setSetting('user_role', role);
    if (tenure) await setSetting('user_tenure', tenure);
    if (concerns.length > 0) await setSetting('user_concerns', JSON.stringify(concerns));
    transitionTo('magic');
  };

  const handleTransform = async () => {
    setIsGenerating(true);
    setAiRewrite('');

    const provider = (await getAIProvider()) as AIProvider;
    const apiKey = await getAIApiKey();
    const model = await getAIModel();

    if (!apiKey) {
      // Demo rewrite — still magical
      const demoText = generateDemoRewrite(workEntry);
      let index = 0;
      const interval = setInterval(() => {
        if (index < demoText.length) {
          setAiRewrite((prev) => prev + demoText[index]);
          index++;
        } else {
          clearInterval(interval);
          setIsGenerating(false);
          setShowResult(true);
        }
      }, 15);
      return;
    }

    const messages = rewriteAsImpact(workEntry, role);
    const config = await import('@/lib/ai/providers').then((m) => m.AI_PROVIDERS[provider]);

    await streamAIResponse(
      provider,
      apiKey,
      model ?? config.defaultModel,
      messages,
      {
        onChunk: (text) => setAiRewrite((prev) => prev + text),
        onDone: () => {
          setIsGenerating(false);
          setShowResult(true);
        },
        onError: () => {
          const demoText = generateDemoRewrite(workEntry);
          setAiRewrite(demoText);
          setIsGenerating(false);
          setShowResult(true);
        },
      }
    );
  };

  const handleFinish = async () => {
    const entry = await encryptWorkLog({
      id: generateId() as string,
      date: todayISO(),
      content: workEntry,
      tags: [],
      impactType: 'other' as const,
      project: '',
      aiRewrite: aiRewrite || null,
      mood: null,
      isPrivate: false,
      isPinned: false,
      createdAt: now(),
      updatedAt: now(),
    });
    await db.workLogs.add(entry);

    await setSetting('onboarding_complete', 'true');
    router.push('/dashboard');
  };

  const handleSkipMagic = async () => {
    await setSetting('onboarding_complete', 'true');
    router.push('/dashboard');
  };

  const stepIndex = step === 'profile' ? 0 : 1;

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Ambient background */}
      <div className="absolute inset-0 bg-bg-primary" />
      <div className="absolute top-0 left-1/3 w-[500px] h-[500px] rounded-full bg-accent/[0.02] blur-[100px]" />

      <div className="relative z-10 flex flex-col items-center min-h-screen px-6 py-12">
        {/* Progress */}
        <StepIndicator steps={2} current={stepIndex} className="mb-12" />

        {/* Content with transition */}
        <div
          className="w-full max-w-lg"
          style={{
            opacity: transitioning ? 0 : 1,
            transform: transitioning ? 'translateY(8px)' : 'translateY(0)',
            transition: 'all 0.3s ease',
          }}
        >
          {step === 'profile' && (
            <ProfileStep
              role={role}
              setRole={setRole}
              tenure={tenure}
              setTenure={setTenure}
              concerns={concerns}
              toggleConcern={toggleConcern}
              onSubmit={handleProfileSubmit}
            />
          )}

          {step === 'magic' && (
            <MagicStep
              workEntry={workEntry}
              setWorkEntry={setWorkEntry}
              aiRewrite={aiRewrite}
              isGenerating={isGenerating}
              showResult={showResult}
              onTransform={handleTransform}
              onFinish={handleFinish}
              onSkip={handleSkipMagic}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// === Sub-components ===

function ProfileStep({
  role,
  setRole,
  tenure,
  setTenure,
  concerns,
  toggleConcern,
  onSubmit,
}: {
  role: string;
  setRole: (v: string) => void;
  tenure: string;
  setTenure: (v: string) => void;
  concerns: string[];
  toggleConcern: (id: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="animate-fade-up">
      <h2 className="text-2xl font-semibold text-text-primary mb-2 tracking-tight">
        Tell me about you
      </h2>
      <p className="text-sm text-text-secondary mb-10 leading-relaxed">
        A few things so we can make this relevant from day one.
      </p>

      <div className="flex flex-col gap-8">
        {/* Role */}
        <div>
          <Input
            id="role"
            label="What do you do?"
            placeholder="e.g., Software Engineer"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          />
          <div className="flex flex-wrap gap-1.5 mt-3">
            {ROLE_SUGGESTIONS.map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`px-3 py-1.5 text-xs rounded-full border transition-all duration-150 ${
                  role === r
                    ? 'border-accent bg-accent-muted text-accent-text scale-[1.02]'
                    : 'border-surface-border text-text-tertiary hover:border-surface-border-hover hover:text-text-secondary'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Tenure */}
        <div>
          <label className="text-sm font-medium text-text-secondary mb-3 block">
            How long at your current role?
          </label>
          <div className="flex gap-2">
            {TENURE_OPTIONS.map((t) => (
              <button
                key={t}
                onClick={() => setTenure(t)}
                className={`flex-1 py-2.5 text-sm rounded-[var(--radius-sm)] border transition-all duration-150 ${
                  tenure === t
                    ? 'border-accent bg-accent-muted text-accent-text'
                    : 'border-surface-border text-text-secondary hover:border-surface-border-hover'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Concerns */}
        <div>
          <label className="text-sm font-medium text-text-secondary mb-3 block">
            What&apos;s on your mind?
          </label>
          <div className="flex flex-col gap-2">
            {CONCERNS.map((c) => {
              const selected = concerns.includes(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => toggleConcern(c.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-[var(--radius-sm)] border text-left text-sm transition-all duration-150 ${
                    selected
                      ? 'border-accent bg-accent-muted text-text-primary'
                      : 'border-surface-border text-text-secondary hover:border-surface-border-hover'
                  }`}
                >
                  <span className="text-base">{c.emoji}</span>
                  <span>{c.label}</span>
                  {selected && (
                    <Check size={14} className="ml-auto text-accent" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <Button
          size="lg"
          onClick={onSubmit}
          disabled={!role.trim()}
          className="w-full shadow-lg shadow-accent/10"
        >
          Continue <ArrowRight size={16} />
        </Button>
      </div>

      <p className="text-xs text-text-tertiary mt-8 text-center">
        None of this leaves your device. Ever.
      </p>
    </div>
  );
}

function MagicStep({
  workEntry,
  setWorkEntry,
  aiRewrite,
  isGenerating,
  showResult,
  onTransform,
  onFinish,
  onSkip,
}: {
  workEntry: string;
  setWorkEntry: (v: string) => void;
  aiRewrite: string;
  isGenerating: boolean;
  showResult: boolean;
  onTransform: () => void;
  onFinish: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="animate-fade-up">
      <h2 className="text-2xl font-semibold text-text-primary mb-2 tracking-tight">
        Tell us something you did at work recently.
      </h2>
      <p className="text-sm text-text-secondary mb-8 leading-relaxed">
        Don&apos;t overthink it. Write it however it comes out. We&apos;re going to show you something.
      </p>

      <Textarea
        id="work-entry"
        placeholder="e.g., I fixed a reporting bug that had been annoying the sales team for months. Took me about a week."
        helper="Messy is fine. One sentence is enough."
        value={workEntry}
        onChange={(e) => setWorkEntry(e.target.value)}
        rows={3}
      />

      {!showResult && (
        <div className="mt-6 flex items-center gap-4">
          <Button
            onClick={onTransform}
            disabled={workEntry.trim().length < 10 || isGenerating}
            className="shadow-lg shadow-accent/10"
          >
            {isGenerating ? (
              <span className="flex items-center gap-2">
                <Sparkles size={16} className="animate-spin" /> Transforming...
              </span>
            ) : (
              <>
                <Sparkles size={16} /> Transform This
              </>
            )}
          </Button>
          <button
            onClick={onSkip}
            className="text-sm text-text-tertiary hover:text-text-secondary transition-colors group"
          >
            I&apos;ll try it later
            <span className="block text-[10px] text-text-tertiary/50 group-hover:text-text-tertiary/70 transition-colors">
              you can rewrite any entry in your journal
            </span>
          </button>
        </div>
      )}

      {/* AI streaming preview (shows while generating) */}
      {isGenerating && aiRewrite && (
        <div className="mt-6">
          <Card variant="accent" className="animate-fade-in">
            <p className="text-sm text-text-primary leading-relaxed">
              {aiRewrite}
              <span className="inline-block w-0.5 h-4 bg-accent ml-0.5 animate-pulse-gentle" />
            </p>
          </Card>
        </div>
      )}

      {/* Final reveal */}
      {showResult && (
        <div className="mt-8 space-y-4">
          {/* Original */}
          <div
            className="animate-fade-up"
            style={{ animationDelay: '0s' }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-widest text-text-tertiary mb-2">
              What you wrote
            </p>
            <Card>
              <p className="text-sm text-text-secondary leading-relaxed">
                {workEntry}
              </p>
            </Card>
          </div>

          {/* Arrow with label */}
          <div
            className="flex flex-col items-center gap-1 animate-fade-in"
            style={{ animationDelay: '0.2s' }}
          >
            <ArrowDown size={20} className="text-accent" />
            <span className="text-[10px] text-text-tertiary">here&apos;s what it&apos;s actually worth</span>
          </div>

          {/* AI version */}
          <div
            className="animate-fade-up"
            style={{ animationDelay: '0.4s' }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-widest text-accent mb-2">
              Your proof
            </p>
            <Card variant="accent">
              <p className="text-sm text-text-primary leading-relaxed">
                {aiRewrite}
              </p>
            </Card>
          </div>

          {/* CTA */}
          <div
            className="pt-4 animate-fade-up"
            style={{ animationDelay: '0.6s' }}
          >
            <p className="text-sm text-text-primary mb-2 font-medium">
              This took 30 seconds. Imagine a year of these.
            </p>
            <p className="text-sm text-text-tertiary mb-6 leading-relaxed">
              Everything you track here is private and stored on your device. No employer sees this. No data leaves. This is yours.
            </p>

            <Button
              size="lg"
              onClick={onFinish}
              className="w-full shadow-lg shadow-accent/10"
            >
              Start My Proof File <ArrowRight size={16} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// === Helpers ===

function generateDemoRewrite(entry: string): string {
  const cleaned = entry.trim().toLowerCase().replace(/^i /i, '').replace(/\.$/, '');
  return `Demonstrated leadership and technical initiative by ${cleaned}, resulting in improved team efficiency and delivering measurable value to stakeholders.`;
}
