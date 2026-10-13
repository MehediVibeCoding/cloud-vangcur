'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store/authStore';
import { useT } from '@/lib/i18n/useT';
import { showToast } from '@/lib/toast';
import { lockBody, unlockBody } from '@/lib/bodyScrollLock';
import UserAvatar from './UserAvatar';
import SkeletonTransition from '@/app/components/ui/SkeletonTransition';
import { QnAListSkeleton } from '@/app/components/ui/Skeletons';
import {
  submitProductQuestion,
  submitProductAnswer,
  checkIsUserAdmin,
} from '@/lib/productQnaData';
import { fetchProfileCompletionMap } from '@/lib/profileData';
import { formatSafeDate } from '@/lib/safeLocaleDate';
import { withTimeout } from '@/lib/withTimeout';
import { TeamVerifiedBadge, VerifiedCustomerBadge } from './VerifiedBadges';
import { confirmDialog } from '@/lib/confirm';
import type { ProductQuestion, ProductQuestionAnswer } from '@/types';

interface ProductQnAProps {
  productId: number | string;
  productName: string;
}

function SolidChatQuestionIcon({ className = '' }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className={`text-white fill-current ${className}`.trim()}>
      <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 12h-2v-2h2v2zm0-4h-2V6h2v4z" />
    </svg>
  );
}

function PlusIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function ReplyCurveIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 17 4 12 9 7" />
      <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

// 🆕 এখন প্রতিটা প্রশ্নে দুইটা ফিক্সড স্লটের (adminAnswer/authorReply) বদলে
// পুরো একটা "থ্রেড" (সময় অনুযায়ী সাজানো একাধিক উত্তর) রাখা হচ্ছে —
// এতে admin আর customer বারবার আদান-প্রদান (একাধিক রাউন্ড) করতে পারবে।
interface QuestionWithThread extends Omit<ProductQuestion, 'answers'> {
  answers: ProductQuestionAnswer[];
}

// 🛠️ বাগ ফিক্স: আগে রিপ্লাই মডাল সবসময় থ্রেডের মূল/প্রথম প্রশ্নটাই দেখাতো, যেটার
// আসলে উত্তর দেওয়া হচ্ছে সেটা না। এই ফাংশন থ্রেডের সঠিক "সর্বশেষ প্রাসঙ্গিক মেসেজ"
// বের করে — কাস্টমার ফলো-আপ দিলে টিমের সর্বশেষ উত্তর, আর টিম উত্তর দিলে কাস্টমারের
// সর্বশেষ মেসেজ (বা কোনো উত্তর না থাকলে মূল প্রশ্ন)।
function getReplyPreview(
  q: QuestionWithThread,
  isFollowUp: boolean,
): { name: string; text: string; isAdminMsg: boolean } {
  if (isFollowUp) {
    const lastAdmin = [...q.answers].reverse().find((a) => a.is_admin);
    if (lastAdmin) return { name: lastAdmin.author_name, text: lastAdmin.answer, isAdminMsg: true };
    return { name: q.user_name, text: q.question, isAdminMsg: false };
  }
  const lastCustomer = [...q.answers].reverse().find((a) => !a.is_admin);
  if (lastCustomer) return { name: lastCustomer.author_name, text: lastCustomer.answer, isAdminMsg: false };
  return { name: q.user_name, text: q.question, isAdminMsg: false };
}

export default function ProductQnA({ productId, productName }: ProductQnAProps) {
  const { t, lang } = useT();
  const supabase = useRef(createClient()).current;
  const currentUser = useAuthStore((s) => s.currentUser);

  const [questions, setQuestions] = useState<QuestionWithThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  // 🆕 কাস্টমার-প্রোফাইল-সম্পূর্ণতার ম্যাপ (userId -> সবুজ ব্যাজ দেখাবে কিনা)
  const [verifiedMap, setVerifiedMap] = useState<Record<string, boolean>>({});

  // Ask Modal
  const [askModalOpen, setAskModalOpen] = useState(false);
  const [askName, setAskName] = useState('');
  const [askQuestion, setAskQuestion] = useState('');
  const [askError, setAskError] = useState('');
  const [submittingQ, setSubmittingQ] = useState(false);

  // Reply/Answer Modal
  const [replyTarget, setReplyTarget] = useState<{ question: QuestionWithThread; isFollowUp: boolean } | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyError, setReplyError] = useState('');
  const [submittingR, setSubmittingR] = useState(false);

  const loadQuestionsData = useCallback(async () => {
    setLoading(true);
    try {
      // 🛡️ withTimeout: নেটওয়ার্ক/ডিভাইস দুর্বল হলে এই কলগুলো ঝুলে থাকতে
      // পারে — ১২ সেকেন্ডের মধ্যে রেসপন্স না এলে reject করে catch ব্লকে
      // চলে যাবে (নাহলে loading চিরকাল আটকে থাকত, এমনকি try/catch থাকা
      // সত্ত্বেও — কারণ একটা promise যেটা কখনোই settle হয় না তাকে কোনো
      // try/catch আটকাতে পারে না)
      const [qData, adminStatus] = await Promise.all([
        withTimeout(
          supabase
            .from('product_questions')
            .select('id, product_id, user_id, user_name, question, created_at')
            .eq('product_id', productId)
            .order('created_at', { ascending: false }),
        ),
        checkIsUserAdmin(supabase, currentUser?.id),
      ]);

      setIsAdmin(adminStatus);

      if (qData.data && qData.data.length > 0) {
        const qIds = qData.data.map((q) => q.id);
        const { data: answersData } = await withTimeout(
          supabase
            .from('product_question_answers')
            .select('id, question_id, user_id, author_name, is_admin, answer, created_at')
            .in('question_id', qIds)
            .order('created_at', { ascending: true }),
        );

        const mapped: QuestionWithThread[] = qData.data.map((q) => ({
          ...q,
          // created_at অনুযায়ী ascending order-এ কোয়েরি করা হয়েছে, তাই থ্রেডের ক্রম এমনিতেই ঠিক থাকবে
          answers: ((answersData || []).filter((a) => a.question_id === q.id)) as ProductQuestionAnswer[],
        }));
        setQuestions(mapped);

        // 🆕 প্রশ্নকর্তা ও (নন-অ্যাডমিন) উত্তরদাতাদের প্রোফাইল-সম্পূর্ণতা একবারে ব্যাচ-চেক
        const customerIds = [
          ...mapped.map((q) => q.user_id),
          ...mapped.flatMap((q) => q.answers.filter((a) => !a.is_admin).map((a) => a.user_id)),
        ];
        fetchProfileCompletionMap(supabase, customerIds).then(setVerifiedMap).catch(() => {});
      } else {
        setQuestions([]);
      }
    } catch {
      setQuestions([]);
    }
    setLoading(false);
  }, [productId, currentUser?.id, supabase]);

  useEffect(() => {
    loadQuestionsData();
  }, [loadQuestionsData]);

  useEffect(() => {
    if (askModalOpen || replyTarget) {
      lockBody();
    } else {
      unlockBody();
    }
    return () => unlockBody();
  }, [askModalOpen, replyTarget]);

  const openAskModal = () => {
    setAskName(currentUser?.name || '');
    setAskQuestion('');
    setAskError('');
    setAskModalOpen(true);
  };

  const handleQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAskError('');
    setSubmittingQ(true);

    const res = await submitProductQuestion(supabase, {
      productId,
      userName: askName,
      question: askQuestion,
      userId: currentUser?.id || null,
    });

    setSubmittingQ(false);
    if (!res.ok || !res.data) {
      setAskError(res.error || t('প্রশ্ন জমা দেওয়া যায়নি'));
      return;
    }

    setQuestions((prev) => [{ ...res.data!, answers: [] }, ...prev]);
    setAskModalOpen(false);
    showToast(t('✅ আপনার প্রশ্নটি সফলভাবে জমা হয়েছে!'));

    // 🛠️ ফিক্স: অপটিমিস্টিক আপডেটে নতুন প্রশ্নটা লোকাল স্টেটে ঢুকে গেলেও
    // verifiedMap-এ নিজের এন্ট্রি না থাকলে (প্রথমবার প্রশ্ন করলে) ব্যাজ
    // দেখাত না — যদিও প্রোফাইল আসলে সম্পূর্ণ। তাই এখানে নিজের আইডির জন্য
    // আলাদা করে ব্যাচ-চেক করে verifiedMap মার্জ করে দেওয়া হচ্ছে।
    if (currentUser?.id) {
      fetchProfileCompletionMap(supabase, [currentUser.id]).then((m) => {
        setVerifiedMap((prev) => ({ ...prev, ...m }));
      });
    }
  };

  const openReplyModal = (question: QuestionWithThread, isFollowUp: boolean) => {
    setReplyTarget({ question, isFollowUp });
    setReplyText('');
    setReplyError('');
  };

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyTarget) return;
    setReplyError('');
    setSubmittingR(true);

    const authorName = isAdmin
      ? 'Vangcur Team'
      : (currentUser?.name || replyTarget.question.user_name || t('প্রশ্নকর্তা'));

    const res = await submitProductAnswer(supabase, {
      questionId: replyTarget.question.id,
      answer: replyText,
      authorName,
      userId: currentUser?.id || null,
      isAdmin,
    });

    setSubmittingR(false);
    if (!res.ok || !res.data) {
      setReplyError(res.error || t('উত্তর জমা দেওয়া যায়নি বা অনুমতি নেই।'));
      return;
    }

    const newAnswer = res.data;
    setQuestions((prev) => prev.map((q) => {
      if (q.id === replyTarget.question.id) {
        return { ...q, answers: [...q.answers, newAnswer] };
      }
      return q;
    }));

    setReplyTarget(null);
    showToast(t('✅ উত্তর সফলভাবে প্রকাশিত হয়েছে!'));

    // 🛠️ ফিক্স: নিজের উত্তরের ক্ষেত্রেও একই কারণে verifiedMap মার্জ করা হচ্ছে
    // (অ্যাডমিনের উত্তরে এর দরকার নেই, TeamVerifiedBadge সবসময় স্ট্যাটিক)
    if (!isAdmin && currentUser?.id) {
      fetchProfileCompletionMap(supabase, [currentUser.id]).then((m) => {
        setVerifiedMap((prev) => ({ ...prev, ...m }));
      });
    }
  };

  const handleDeleteQuestion = async (qId: number | string) => {
    const ok = await confirmDialog({
      title: t('প্রশ্ন মুছে ফেলবেন?'),
      message: t('আপনি কি নিশ্চিতভাবে এই প্রশ্নটি মুছে ফেলতে চান?'),
      confirmText: t('মুছে ফেলুন'),
      cancelText: t('বাতিল'),
      tone: 'danger',
    });
    if (!ok) return;
    try {
      const { error } = await supabase.from('product_questions').delete().eq('id', qId);
      if (error) throw error;
      setQuestions((prev) => prev.filter((q) => q.id !== qId));
      showToast(t('প্রশ্নটি মুছে ফেলা হয়েছে'));
    } catch {
      showToast(t('মুছে ফেলা সম্ভব হয়নি'));
    }
  };

  const handleDeleteAnswer = async (ansId: number | string, qId: number | string) => {
    const ok = await confirmDialog({
      title: t('উত্তর মুছে ফেলবেন?'),
      message: t('আপনি কি এই উত্তরটি মুছে ফেলতে চান?'),
      confirmText: t('মুছে ফেলুন'),
      cancelText: t('বাতিল'),
      tone: 'danger',
    });
    if (!ok) return;
    try {
      const { error } = await supabase.from('product_question_answers').delete().eq('id', ansId);
      if (error) throw error;
      setQuestions((prev) => prev.map((q) => {
        if (q.id === qId) {
          return { ...q, answers: q.answers.filter((a) => a.id !== ansId) };
        }
        return q;
      }));
      showToast(t('উত্তরটি মুছে ফেলা হয়েছে'));
    } catch {
      showToast(t('মুছে ফেলা সম্ভব হয়নি'));
    }
  };

  const hasQuestions = questions.length > 0;

  return (
    <div className="py-2">
      {/* Header Block — প্রশ্ন থাকলে বাটন হেডারের ডানে থাকবে, প্রশ্ন না থাকলে নিচে */}
      <div className="mb-5 flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 font-body text-lg font-bold text-ink">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-light text-white shadow-xs">
              <SolidChatQuestionIcon />
            </span>
            <span>
              {lang === 'en' ? (
                <>Customer <span className="text-brand-light">Q&A</span></>
              ) : (
                <>কাস্টমার <span className="text-brand-light">প্রশ্নোত্তর (Q&A)</span></>
              )}
            </span>
          </div>

          {/* প্রশ্ন থাকা অবস্থায় হেডারের ডানপাশের বাটন */}
          {hasQuestions && (
            <button
              onClick={openAskModal}
              className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full bg-brand-light px-4 font-body text-xs font-bold text-white shadow-sh1 transition-brand hover:bg-brand-light-hover"
            >
              <PlusIcon />
              <span>{lang === 'en' ? 'Ask a New Question' : 'নতুন প্রশ্ন করুন'}</span>
            </button>
          )}
        </div>

        <p className="font-body text-[12.5px] text-muted">
          {lang === 'en'
            ? `Have a question about ${productName}? Ask now and get answers from our team.`
            : `${productName} সম্পর্কে কোনো প্রশ্ন থাকলে এখানে জেনে নিন।`}
        </p>
      </div>

      <SkeletonTransition isReady={!loading} skeleton={<QnAListSkeleton />}>
      {!hasQuestions ? (
        <div className="flex flex-col items-center justify-center rounded-[18px] border border-dashed border-border-base bg-surface-muted/50 p-6 text-center">
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-brand-light text-white">
            <SolidChatQuestionIcon className="h-5 w-5 fill-current text-white" />
          </div>
          <p className="font-body text-sm font-bold text-ink">{t('এখনো কোনো প্রশ্ন করা হয়নি')}</p>
          <p className="mt-1 max-w-sm font-body text-xs text-muted">
            {t('এই প্রোডাক্ট সম্পর্কে আপনার কোনো কিছু জানার থাকলে সবার আগে প্রশ্ন করুন!')}
          </p>
          <button
            onClick={openAskModal}
            className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-full bg-brand-light px-6 font-body text-xs font-bold text-white shadow-sh1 transition-brand hover:bg-brand-light-hover"
          >
            <PlusIcon /> {t('প্রথম প্রশ্নটি করুন')}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {questions.map((q) => {
            // 🛡️ Safari-তে malformed/invalid created_at থাকলে toLocaleDateString()
            // RangeError থ্রো করতে পারে (Chrome-এ করে না) — safe helper ব্যবহার করা হচ্ছে
            const dateStr = formatSafeDate(q.created_at, lang);

            const isAuthor = Boolean(currentUser?.id) && q.user_id === currentUser?.id;
            const canDeleteQuestion = isAdmin || isAuthor;

            // 🆕 turn-based হিসাব: প্রশ্নে এ পর্যন্ত admin কতবার আর customer কতবার উত্তর দিয়েছে
            const adminCount = q.answers.filter((a) => a.is_admin).length;
            const customerCount = q.answers.filter((a) => !a.is_admin).length;

            // অ্যাডমিনের কোনো লিমিট নেই — DB পলিসির সাথে মিলিয়ে সবসময় উত্তর দিতে পারবে
            const canAdminAnswer = isAdmin;
            // কাস্টমার তখনই রিপ্লাই দিতে পারবে যখন admin-এর উত্তর সংখ্যা customer-এর রিপ্লাই সংখ্যার চেয়ে বেশি
            const canAuthorFollowUp = isAuthor && adminCount > customerCount;

            return (
              <div
                key={q.id}
                className="relative rounded-brand border border-border-base bg-white p-4 shadow-sh1 transition-brand duration-brand hover:border-brand-light/30"
              >
                {/* ১. Question Row */}
                <div className="flex items-start gap-3">
                  <UserAvatar name={q.user_name} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-body text-[13px] font-bold text-ink">{q.user_name}</span>
                        {q.user_id && verifiedMap[q.user_id] && <VerifiedCustomerBadge />}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-body text-[11px] text-muted">{dateStr}</span>
                        {canDeleteQuestion && (
                          <button
                            onClick={() => handleDeleteQuestion(q.id)}
                            title={t('প্রশ্ন মুছে ফেলুন')}
                            className="text-muted/60 transition-colors hover:text-red-500"
                          >
                            <TrashIcon />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="mt-1 font-body text-[13.5px] leading-relaxed text-ink/90">
                      {q.question}
                    </p>
                  </div>
                </div>

                {/* ২. পুরো উত্তর-থ্রেড — admin ও customer-এর সব উত্তর সময় অনুযায়ী */}
                {q.answers.length > 0 && (
                  <div className="mt-3.5 flex flex-col gap-2.5">
                    {q.answers.map((a) =>
                      a.is_admin ? (
                        <div
                          key={a.id}
                          className="flex items-start gap-3 rounded-[14px] border border-[#BAE0FD] bg-[#EFF8FF] p-3.5 sm:ml-9"
                        >
                          <UserAvatar name={a.author_name} size="sm" isAdmin />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center justify-between gap-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-body text-[12.5px] font-bold text-ink">
                                  {a.author_name}
                                </span>
                                <TeamVerifiedBadge />
                              </div>

                              {isAdmin && (
                                <button
                                  onClick={() => handleDeleteAnswer(a.id, q.id)}
                                  title={t('উত্তর মুছে ফেলুন')}
                                  className="text-muted/60 transition-colors hover:text-red-500"
                                >
                                  <TrashIcon />
                                </button>
                              )}
                            </div>
                            <p className="mt-1 font-body text-[13px] leading-relaxed text-ink/80">
                              {a.answer}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div
                          key={a.id}
                          className="flex items-start gap-3 rounded-[12px] border border-border-base bg-surface-muted/60 p-3 sm:ml-16"
                        >
                          <UserAvatar name={a.author_name} size="sm" />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center justify-between gap-1">
                              <div className="flex items-center gap-2">
                                <span className="font-body text-[12px] font-bold text-ink">
                                  {a.author_name}
                                </span>
                                {a.user_id && verifiedMap[a.user_id] && <VerifiedCustomerBadge />}
                                <span className="rounded-full bg-surface-muted px-2 py-0.5 font-body text-[9.5px] font-semibold text-muted">
                                  {t('প্রশ্নকর্তার মন্তব্য')}
                                </span>
                              </div>

                              {(isAdmin || isAuthor) && (
                                <button
                                  onClick={() => handleDeleteAnswer(a.id, q.id)}
                                  title={t('মন্তব্য মুছে ফেলুন')}
                                  className="text-muted/60 transition-colors hover:text-red-500"
                                >
                                  <TrashIcon />
                                </button>
                              )}
                            </div>
                            <p className="mt-1 font-body text-[12.5px] leading-relaxed text-ink/80">
                              {a.answer}
                            </p>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}

                {/* ৩. অ্যাডমিনের উত্তর/আরেকটি উত্তর দেওয়ার বাটন — এখন উত্তর আগে থেকে থাকলেও হাইড হয় না */}
                {canAdminAnswer && (
                  <div className="mt-3 flex justify-end pt-1 sm:ml-9">
                    <button
                      onClick={() => openReplyModal(q, false)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-brand-light px-3.5 py-1.5 font-body text-xs font-bold text-white shadow-xs transition-brand hover:bg-brand-light-hover"
                    >
                      <ReplyCurveIcon /> {adminCount > 0 ? t('আরেকটি উত্তর দিন (Admin)') : t('উত্তর দিন (Admin)')}
                    </button>
                  </div>
                )}

                {/* ৪. কাস্টমারের ফলো-আপ বাটন — এখন প্রতিটা admin-উত্তরের পর আবার একবার করে সুযোগ পাবে */}
                {canAuthorFollowUp && (
                  <div className="mt-2.5 flex justify-end sm:ml-9">
                    <button
                      onClick={() => openReplyModal(q, true)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-brand-light bg-white px-3.5 py-1.5 font-body text-xs font-bold text-brand-light shadow-xs transition-brand hover:bg-brand-bg"
                    >
                      <ReplyCurveIcon /> {t('উত্তরে রিপ্লাই দিন')}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      </SkeletonTransition>

      {/* Ask Question Modal */}
      {askModalOpen && (
        <div
          className="fixed inset-0 z-[1100] flex items-center justify-center bg-ink/50 p-4 backdrop-blur-[2px] animate-section-reveal"
          onClick={(e) => { if (e.target === e.currentTarget) setAskModalOpen(false); }}
        >
          <div className="w-full max-w-[440px] rounded-[22px] bg-white p-6 shadow-sh3">
            <div className="mb-4 flex items-center justify-between border-b border-border-base pb-3">
              <h3 className="flex items-center gap-2 font-body text-base font-bold text-ink">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-light text-white">
                  <SolidChatQuestionIcon />
                </span>
                {t('প্রশ্ন করুন')}
              </h3>
              <motion.button
                onClick={() => setAskModalOpen(false)}
                whileTap={{ scale: 0.92 }}
                transition={{ type: 'spring', stiffness: 480, damping: 28 }}
                className="flex h-7 w-7 items-center justify-center rounded-full text-muted hover:bg-surface-muted hover:text-ink"
              >
                ✕
              </motion.button>
            </div>

            <form onSubmit={handleQuestionSubmit} className="flex flex-col gap-3.5">
              <div>
                <label className="mb-1 block font-body text-xs font-bold text-ink">{t('আপনার নাম')}</label>
                <input
                  type="text"
                  required
                  maxLength={30}
                  value={askName}
                  disabled={!!currentUser?.name && !isAdmin}
                  onChange={(e) => setAskName(e.target.value)}
                  placeholder={t('আপনার নাম লিখুন')}
                  className="w-full rounded-xl border border-border-base bg-white px-3.5 py-2.5 font-body text-[13.5px] text-ink outline-none transition-brand focus:border-brand-light disabled:bg-surface-muted disabled:text-muted"
                />
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="font-body text-xs font-bold text-ink">{t('আপনার প্রশ্ন')}</label>
                  <span className="font-body text-[11px] text-muted">{askQuestion.length}/100</span>
                </div>
                <textarea
                  required
                  rows={3}
                  maxLength={100}
                  value={askQuestion}
                  onChange={(e) => setAskQuestion(e.target.value)}
                  placeholder={t('প্রোডাক্ট সম্পর্কে আপনি কী জানতে চান? (কমপক্ষে ১০ অক্ষর)')}
                  className="w-full rounded-xl border border-border-base bg-white p-3 font-body text-[13.5px] text-ink outline-none transition-brand focus:border-brand-light"
                />
              </div>

              {askError && (
                <div className="rounded-lg bg-red-50 p-2.5 font-body text-xs font-semibold text-red-600">
                  {askError}
                </div>
              )}

              <button
                type="submit"
                disabled={submittingQ || askQuestion.trim().length < 10}
                className="mt-1 w-full rounded-full bg-brand-light py-3 font-body text-sm font-bold text-white shadow-sh1 transition-brand hover:bg-brand-light-hover disabled:opacity-50"
              >
                {submittingQ ? t('জমা হচ্ছে...') : t('প্রশ্ন সাবমিট করুন')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Reply/Answer Modal */}
      {replyTarget && (
        <div
          className="fixed inset-0 z-[1100] flex items-center justify-center bg-ink/50 p-4 backdrop-blur-[2px] animate-section-reveal"
          onClick={(e) => { if (e.target === e.currentTarget) setReplyTarget(null); }}
        >
          <div className="w-full max-w-[440px] rounded-[22px] bg-white p-6 shadow-sh3">
            <div className="mb-4 flex items-center justify-between border-b border-border-base pb-3">
              <h3 className="flex items-center gap-2 font-body text-base font-bold text-ink">
                <ReplyCurveIcon className="text-brand-light" /> 
                {isAdmin ? t('Vangcur টিমের উত্তর') : t('আপনার ফলো-আপ মন্তব্য')}
              </h3>
              <motion.button
                onClick={() => setReplyTarget(null)}
                whileTap={{ scale: 0.92 }}
                transition={{ type: 'spring', stiffness: 480, damping: 28 }}
                className="flex h-7 w-7 items-center justify-center rounded-full text-muted hover:bg-surface-muted hover:text-ink"
              >
                ✕
              </motion.button>
            </div>

            <div className="mb-3 rounded-xl border border-border-base bg-surface-muted/70 p-3">
              <div className="mb-1.5 flex items-center gap-1.5 font-body text-[10.5px] font-bold uppercase tracking-wide text-muted">
                <ReplyCurveIcon className="text-muted" />
                {t('আপনি যেটির উত্তরে লিখছেন')}
              </div>
              {(() => {
                const preview = getReplyPreview(replyTarget.question, replyTarget.isFollowUp);
                return (
                  <>
                    <div className="flex items-center gap-1.5">
                      <span className="font-body text-xs font-bold text-ink">{preview.name}</span>
                      {preview.isAdminMsg && <TeamVerifiedBadge />}
                    </div>
                    <p className="mt-0.5 line-clamp-2 font-body text-xs leading-relaxed text-ink/75">
                      &quot;{preview.text}&quot;
                    </p>
                  </>
                );
              })()}
            </div>

            <form onSubmit={handleReplySubmit} className="flex flex-col gap-3.5">
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="font-body text-xs font-bold text-ink">
                    {isAdmin ? t('অফিসিয়াল উত্তর লিখুন') : t('আপনার মন্তব্য')}
                  </label>
                  <span className="font-body text-[11px] text-muted">{replyText.length}/500</span>
                </div>
                <textarea
                  required
                  rows={4}
                  maxLength={500}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={isAdmin ? t('সঠিক ও স্পষ্ট উত্তর লিখুন...') : t('আপনার মন্তব্য লিখুন...')}
                  className="w-full rounded-xl border border-border-base bg-white p-3 font-body text-[13.5px] text-ink outline-none transition-brand focus:border-brand-light"
                />
              </div>

              {replyError && (
                <div className="rounded-lg bg-red-50 p-2.5 font-body text-xs font-semibold text-red-600">
                  {replyError}
                </div>
              )}

              <button
                type="submit"
                disabled={submittingR || replyText.trim().length < 5}
                className="mt-1 w-full rounded-full bg-brand-light py-3 font-body text-sm font-bold text-white shadow-sh1 transition-brand hover:bg-brand-light-hover disabled:opacity-50"
              >
                {submittingR ? t('প্রকাশ হচ্ছে...') : t('প্রকাশ করুন')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
