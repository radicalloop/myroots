import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserRound } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { useUpdateProfile } from "@/hooks/api/useFamilyTree";
import {
  ProfileFormValues,
  profileSchema,
} from "@/validations/family-tree.validation";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function ProfilePage() {
  const { user } = useAuth();
  const updateProfileMutation = useUpdateProfile();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName ?? "",
      lastName: user?.lastName ?? "",
    },
    mode: "onChange",
  });

  useEffect(() => {
    reset({
      firstName: user?.firstName ?? "",
      lastName: user?.lastName ?? "",
    });
  }, [reset, user?.firstName, user?.lastName]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
          <UserRound className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
            Profile
          </h1>
          <p className="text-sm text-text-secondary">
            Update the name used across your MyRoots account.
          </p>
        </div>
      </div>

      <Card padding="lg">
        <form
          onSubmit={handleSubmit((values) =>
            updateProfileMutation.mutate(values),
          )}
          className="space-y-5"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="First name"
              type="text"
              autoComplete="given-name"
              {...register("firstName")}
              required
              error={errors.firstName?.message}
            />
            <Input
              label="Last name"
              type="text"
              autoComplete="family-name"
              {...register("lastName")}
              required
              error={errors.lastName?.message}
            />
          </div>

          <Input
            label="Email"
            type="email"
            value={user?.email ?? ""}
            disabled
            hint="Your account email cannot be changed here."
          />

          <div className="flex justify-end">
            <Button
              type="submit"
              loading={updateProfileMutation.isPending}
              disabled={!isDirty}
            >
              Save changes
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
