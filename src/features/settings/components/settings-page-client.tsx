"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import {
  changePassword,
  deleteAccount,
  updateProfile,
} from "@/features/auth/actions/user.actions";
import {
  changePasswordSchema,
  updateProfileSchema,
  type ChangePasswordInput,
  type UpdateProfileInput,
} from "@/features/auth/schemas/auth.schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SettingsPageClientProps = Readonly<{
  user: {
    name: string;
    email: string;
  };
}>;

export function SettingsPageClient({ user }: SettingsPageClientProps) {
  const router = useRouter();
  const [isProfilePending, startProfileTransition] = useTransition();
  const [isPasswordPending, startPasswordTransition] = useTransition();
  const [isDeletePending, startDeleteTransition] = useTransition();
  const profileForm = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: user,
  });
  const passwordForm = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  return (
    <section className="grid gap-6">
      <div>
        <h1 className="text-xl font-bold text-slate-950 sm:text-2xl">Settings</h1>
        <p className="text-sm text-slate-600">Manage your profile and account preferences</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <form
          className="grid gap-4 rounded-[28px] border border-slate-200 bg-white p-4 sm:p-6"
          onSubmit={profileForm.handleSubmit((values) =>
            startProfileTransition(async () => {
              const result = await updateProfile(values);

              if (!result.success) {
                toast.error(result.error);
                return;
              }

              toast.success("Profile updated.");
              router.refresh();
            }),
          )}
        >
          <h2 className="text-lg sm:text-xl font-semibold text-slate-950">Profile</h2>
          <Input
            label="Name"
            error={profileForm.formState.errors.name?.message}
            {...profileForm.register("name")}
          />
          <Input
            label="Email"
            type="email"
            error={profileForm.formState.errors.email?.message}
            {...profileForm.register("email")}
          />
          <Button type="submit" disabled={isProfilePending} className="w-full sm:w-auto">
            {isProfilePending ? "Saving..." : "Save profile"}
          </Button>
        </form>
        <form
          className="grid gap-4 rounded-[28px] border border-slate-200 bg-white p-4 sm:p-6"
          onSubmit={passwordForm.handleSubmit((values) =>
            startPasswordTransition(async () => {
              const result = await changePassword(values);

              if (!result.success) {
                toast.error(result.error);
                return;
              }

              toast.success("Password changed. Other refresh sessions were cleared.");
              passwordForm.reset();
            }),
          )}
        >
          <h2 className="text-lg sm:text-xl font-semibold text-slate-950">Change password</h2>
          <Input
            label="Current password"
            type="password"
            error={passwordForm.formState.errors.currentPassword?.message}
            {...passwordForm.register("currentPassword")}
          />
          <Input
            label="New password"
            type="password"
            error={passwordForm.formState.errors.newPassword?.message}
            {...passwordForm.register("newPassword")}
          />
          <Input
            label="Confirm new password"
            type="password"
            error={passwordForm.formState.errors.confirmPassword?.message}
            {...passwordForm.register("confirmPassword")}
          />
          <Button type="submit" disabled={isPasswordPending} className="w-full sm:w-auto">
            {isPasswordPending ? "Updating..." : "Change password"}
          </Button>
        </form>
      </div>
      <div className="rounded-[28px] border border-red-200 bg-red-50 p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold text-red-800">Delete account</h2>
        <p className="mt-2 text-sm text-red-700">
          Type DELETE to permanently remove your account and all related data.
        </p>
        <form
          className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={async (event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            const confirmation = String(formData.get("confirmation") ?? "");

            startDeleteTransition(async () => {
              const result = await deleteAccount(confirmation);

              if (!result.success) {
                toast.error(result.error);
                return;
              }

              toast.success("Account deleted.");
              router.push("/register");
              router.refresh();
            });
          }}
        >
          <div className="flex-1">
            <Input name="confirmation" placeholder="DELETE" />
          </div>
          <Button variant="danger" type="submit" disabled={isDeletePending} className="w-full sm:w-auto">
            {isDeletePending ? "Deleting..." : "Delete account"}
          </Button>
        </form>
      </div>
    </section>
  );
}
