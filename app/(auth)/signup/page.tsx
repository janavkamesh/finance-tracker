"use client";

import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn as nextAuthSignIn } from "next-auth/react";
import { signupSchema, type SignupInput } from "@/lib/validations/auth";
import { signUp } from "@/actions/auth";
import { DashboardPreview } from "@/components/auth/dashboard-preview";

function SignupForm() {
  const [emailSent, setEmailSent] = useState(false);
  const searchParams = useSearchParams();
  const oauthError = searchParams.get("error");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
  });

  async function onSubmit(data: SignupInput) {
    const formData = new FormData();
    formData.set("full_name", data.full_name);
    formData.set("email", data.email);
    formData.set("password", data.password);
    const result = await signUp(formData);
    if (result?.error) toast.error(result.error);
    else if (result?.confirmEmail) setEmailSent(true);
  }

  /**
   * Initiates the Google OAuth flow via NextAuth.
   * After OAuth succeeds, NextAuth redirects to the session-bridge route which
   * creates a Supabase session and sends the user to /dashboard.
   */
  function handleGoogleSignIn() {
    nextAuthSignIn("google", {
      callbackUrl: "/api/auth/nextauth-callback",
    });
  }

  if (emailSent) {
    return (
      <div className="w-full max-w-sm text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-4">
          <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900">Check your email</h2>
        <p className="text-sm text-gray-500 mt-2">
          We sent a confirmation link to your inbox. Click it to activate your account.
        </p>
        <Link href="/login" className="inline-block mt-6 text-sm font-medium text-[#1E6B4E] hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#1E6B4E] mb-4">
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">FinTrack India</h1>
        <p className="text-sm text-gray-500 mt-1">Create your free account</p>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-7">
        {/* OAuth error banner */}
        {oauthError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
            Google sign-up failed — please try again or create an account with email.
          </div>
        )}

        {/* Google button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          className="w-full flex items-center justify-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors mb-4"
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-gray-100" />
          <span className="text-xs text-gray-400 font-medium">or</span>
          <div className="flex-1 h-px bg-gray-100" />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          {/* Full name */}
          <div>
            <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1.5">Full name</label>
            <input
              id="full_name"
              type="text"
              autoComplete="name"
              {...register("full_name")}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1E6B4E]/30 focus:border-[#1E6B4E] transition-colors"
              placeholder="Arjun Sharma"
            />
            {errors.full_name && <p className="mt-1.5 text-xs text-red-600">{errors.full_name.message}</p>}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              {...register("email")}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1E6B4E]/30 focus:border-[#1E6B4E] transition-colors"
              placeholder="you@example.com"
            />
            {errors.email && <p className="mt-1.5 text-xs text-red-600">{errors.email.message}</p>}
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              {...register("password")}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1E6B4E]/30 focus:border-[#1E6B4E] transition-colors"
              placeholder="Min. 6 characters"
            />
            {errors.password && <p className="mt-1.5 text-xs text-red-600">{errors.password.message}</p>}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-[#1E6B4E] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#185c43] focus:outline-none focus:ring-2 focus:ring-[#1E6B4E]/50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? "Creating account…" : "Create account"}
          </button>
        </form>
      </div>

      {/* Footer */}
      <p className="text-center text-sm text-gray-500 mt-5">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-[#1E6B4E] hover:underline">
          Sign in
        </Link>
      </p>
      <p className="text-center text-xs text-gray-400 mt-3 flex items-center justify-center gap-1.5">
        <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        Your data is encrypted and never shared
      </p>
    </div>
  );
}

export default function SignupPage() {
  return (
    <main className="min-h-screen flex bg-[#F9F8F5]">
      {/* ── Left: Form ── */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <Suspense fallback={<p className="text-sm text-gray-400">Loading…</p>}>
          <SignupForm />
        </Suspense>
      </div>

      {/* ── Right: Dashboard preview (desktop only) ── */}
      <div className="hidden lg:flex w-[480px] shrink-0 bg-[#1E6B4E]">
        <DashboardPreview />
      </div>
    </main>
  );
}
