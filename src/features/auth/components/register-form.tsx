"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";

import { registerAction } from "@/features/auth/actions/auth.actions";
import { registerSchema, type RegisterInput } from "@/features/auth/schemas/auth.schemas";
import { AuthFormShell } from "@/features/auth/components/auth-form-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function RegisterForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const result = await registerAction({
        name: values.name,
        email: values.email,
        password: values.password,
        confirmPassword: values.confirmPassword,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Account created.");
      router.push(result.data.redirectTo);
      router.refresh();
    });
  });

  return (
    <AuthFormShell
      title="Create your account"
      description="Start with default categories and expand as your workflow grows."
      footer={
        <span>
          Already have an account?{" "}
          <Link className="font-medium text-slate-950" href="/login">
            Sign in
          </Link>
        </span>
      }
    >
      <form className="grid gap-4" onSubmit={onSubmit}>
        <Input
          label="Name"
          placeholder="Alex Budget"
          error={errors.name?.message}
          {...register("name")}
        />
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
        <Input
          label="Confirm password"
          type="password"
          placeholder="Repeat your password"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />
        <Button className="mt-2 w-full" type="submit" disabled={isPending}>
          {isPending ? "Creating account..." : "Create account"}
        </Button>
      </form>
    </AuthFormShell>
  );
}
