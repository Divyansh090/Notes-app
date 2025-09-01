"use client";

import {  useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Image from "next/image";

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
});

type SignupForm = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [showOTP, setShowOTP] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: SignupForm) => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.email,
          name: data.name,
          type: "signup",
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setEmail(data.email);
        setName(data.name);
        setShowOTP(true);
      } else {
        setError(result.error || "Failed to send OTP");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const verifyOTP = async () => {
    const otpString = otp.join("");

    if (otpString.length !== 6) {
      setError("Please enter all 6 digits");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email,
        otp: otpString,
        name,
        type: "signup",
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid or expired OTP");
      } else if (result?.ok) {
        router.push("/dashboard");
      }
    } catch {
      setError("Verification failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const resendOTP = async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, type: "signup" }),
      });

      if (response.ok) {
        setOtp(["", "", "", "", "", ""]);
      } else {
        setError("Failed to resend OTP");
      }
    } catch {
      setError("Network error");
    } finally {
      setIsLoading(false);
    }
  };

  if (showOTP) {
    return (
      <div className="min-h-screen flex flex-col lg:flex-row">
        {/* Left Side - Form */}
        <div className="flex-1 bg-white flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            {/* Logo */}
            <div className="flex items-center mb-12">
              <Image
                src="/top.svg"
                alt="logo"
                  width="8"
                height="8"
                className="w-8 h-8  rounded-lg flex items-center justify-center "
              />

              <span className="text-xl font-semibold text-gray-900">HD</span>
            </div>

            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Verify OTP
              </h1>
              <p className="text-gray-600">
                Enter the 6-digit code sent to {email}
              </p>
            </div>

            {/* OTP Input */}
            <div className="mb-6">
              <div className="flex space-x-3 justify-center">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    id={`otp-${index}`}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) =>
                      handleOtpChange(
                        index,
                        e.target.value.replace(/[^0-9]/g, "")
                      )
                    }
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    className="w-12 h-12 text-center text-xl font-semibold border-2 text-gray-400 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  />
                ))}
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Verify Button */}
            <button
              onClick={verifyOTP}
              disabled={isLoading || otp.join("").length !== 6}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed mb-4"
            >
              {isLoading ? "Verifying..." : "Verify & Sign Up"}
            </button>

            {/* Resend */}
            <button
              onClick={resendOTP}
              disabled={isLoading}
              className="w-full text-blue-500 hover:text-blue-600 font-medium py-2"
            >
              Resend OTP
            </button>

            {/* Back to email */}
            <button
              onClick={() => {
                setShowOTP(false);
                setOtp(["", "", "", "", "", ""]);
                setError("");
              }}
              className="w-full text-gray-500 hover:text-gray-600 text-sm mt-4"
            >
              ← Change email address
            </button>
          </div>
        </div>

        {/* Right Side - Background (hidden on small screens) */}
        <div className="hidden lg:flex flex-1 relative overflow-hidden bg-white">
          <div className="relative w-full h-full">
            <Image
              src="/rt.png"
              alt="Background Image"
              width="100"
              height="100"
              className="h-screen w-full"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Side - Form */}
      <div className="flex-1 bg-white flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex items-center mb-12">
            <Image
              src="/top.svg"
              alt="logo"
                width="8"
                height="8"
              className="w-8 h-8  rounded-lg flex items-center justify-center "
            />
            <span className="text-xl font-semibold text-gray-900">HD</span>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Sign up</h1>
            <p className="text-gray-600">Sign up to enjoy the feature of HD</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Name
              </label>
              <input
                {...register("name")}
                type="text"
                className="w-full px-4 py-3 border text-gray-400 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Jonas Khanwald"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                {...register("email")}
                type="email"
                className="w-full px-4 py-3 border border-gray-300 text-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="jonas_kahnwald@gmail.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.email.message}
                </p>
              )}
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Sending..." : "Get OTP"}
            </button>
          </form>

          <p className="mt-8 text-center text-gray-600">
            Already have an account?{" "}
            <Link
              href="/auth/signin"
              className="text-blue-500 hover:text-blue-600 font-medium"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {/* Right Side - Background (hidden on small screens) */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-white">
        <div className="relative w-full h-full">
          <Image
            src="/rt.png"
            alt="Background Image"
            width="100"
            height="100"
            className="h-screen w-full"
          />
        </div>
      </div>
    </div>
  );
}
