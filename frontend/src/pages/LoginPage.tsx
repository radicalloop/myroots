import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import { Trees } from "lucide-react";
import {
  loginSchema,
  LoginFormValues,
} from "@/validations/family-tree.validation";
import { useLogin } from "@/hooks/api/useFamilyTree";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FamilyTreeIllustration } from "@/components/auth/FamilyTreeIllustration";
import { ROUTES } from "@/constants/app.constants";

export function LoginPage() {
  const loginMutation = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  return (
    <div className="flex min-h-screen">
      {/* Left panel - illustration */}
      <div className="relative hidden flex-1 flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-50 via-warm-50 to-brand-100 p-12 lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
            <Trees className="h-5 w-5" aria-hidden="true" />
          </div>
          <span className="font-serif text-xl font-normal text-brand-800">
            MyRoots
          </span>
        </div>

        <div className="mx-auto max-w-lg animate-fade-in">
          <FamilyTreeIllustration />
        </div>

        <div className="space-y-2">
          <h2 className="font-serif text-3xl font-normal leading-tight text-brand-900">
            Preserve your family legacy
          </h2>
          <p className="max-w-md text-sm leading-relaxed text-brand-700/80">
            Build beautiful family trees, discover connections, and share your
            heritage with generations to come.
          </p>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 sm:px-12">
        <div className="mb-8 flex items-center gap-3 lg:hidden">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
            <Trees className="h-5 w-5" aria-hidden="true" />
          </div>
          <span className="font-serif text-xl font-normal text-brand-800">
            MyRoots
          </span>
        </div>

        <Card className="w-full max-w-md animate-slide-up p-8" padding="none">
          <div className="md:p-8">
            <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
              Welcome back
            </h1>
            <p className="mt-2 text-sm text-text-secondary">
              Sign in to continue building your family trees
            </p>

            <form
              onSubmit={handleSubmit((values) => loginMutation.mutate(values))}
              className="mt-8 space-y-5"
            >
              <Input
                label="Email"
                type="email"
                placeholder="you@example.com"
                {...register("email")}
                error={errors.email?.message}
              />
              <Input
                label="Password"
                type="password"
                placeholder="Enter your password"
                {...register("password")}
                error={errors.password?.message}
              />
              <Button
                type="submit"
                loading={loginMutation.isPending}
                className="w-full"
                size="lg"
              >
                Sign in
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-text-secondary">
              Don&apos;t have an account?{" "}
              <Link
                to={ROUTES.SIGNUP}
                className="font-medium text-brand-600 transition-colors hover:text-brand-700"
              >
                Create one
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
