"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";

import { loginAction } from "@/features/auth/actions/auth.actions";
import { loginSchema, type LoginInput } from "@/features/auth/schemas/auth.schemas";
import { AuthFormShell } from "@/features/auth/components/auth-form-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const redirectTo = searchParams.get("redirectTo") ?? "/dashboard";
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const result = await loginAction({
        email: values.email,
        password: values.password,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Welcome back.");
      router.push(redirectTo || result.data.redirectTo);
      router.refresh();
    });
  });

  return (
    <AuthFormShell
      title="Sign in"
      description="Pick up where you left off and keep your budget on track."
      footer={
        <span>
          No account yet?{" "}
          <Link className="font-medium text-slate-950" href="/register">
            Create one
          </Link>
        </span>
      }
    >
      <form className="grid gap-4" onSubmit={onSubmit}>
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register("email")}
        />
        <Input
          label="Password"
          type="password"
          placeholder="At least 8 characters"
          error={errors.password?.message}
          {...register("password")}
        />
        <Button className="mt-2 w-full" type="submit" disabled={isPending}>
          {isPending ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </AuthFormShell>
  );
}
