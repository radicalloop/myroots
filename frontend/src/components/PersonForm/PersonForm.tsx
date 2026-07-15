import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  personSchema,
  PersonFormValues,
} from '@/validations/family-tree.validation';
import { Gender, Person, TreePersonNode } from '@/types/api.types';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import clsx from 'clsx';
import { todayInputDate } from '@/utils/person.utils';
import { CalendarDays, ChevronDown, HeartPulse, UserRound } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface PersonFormProps {
  defaultValues?: Partial<PersonFormValues>;
  onSubmit: (values: PersonFormValues) => void;
  loading?: boolean;
  submitLabel?: string;
}

const fieldClassName = clsx(
  'w-full rounded-xl border border-border-soft bg-white px-3.5 py-2.5 text-sm text-text-primary',
  'outline-none transition-all duration-200 hover:border-warm-300',
  'focus:border-brand-400 focus:ring-[3px] focus:ring-brand-500/15',
);

function formatGenderLabel(gender: Gender): string {
  return gender.charAt(0) + gender.slice(1).toLowerCase();
}

function FormSection({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border-subtle bg-gradient-to-b from-warm-50/50 to-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)] sm:p-5">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100/80">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <h4 className="text-sm font-semibold tracking-tight text-text-primary">
          {title}
        </h4>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export function PersonForm({
  defaultValues,
  onSubmit,
  loading,
  submitLabel = 'Save',
}: PersonFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PersonFormValues>({
    resolver: zodResolver(personSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      gender: Gender.MALE,
      birth_date: '',
      death_date: '',
      birth_place: '',
      current_place: '',
      health_note: '',
      ...defaultValues,
    },
  });

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar px-5 py-5 sm:px-6">
        <FormSection icon={UserRound} title="Personal details">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="First name"
              {...register('first_name')}
              error={errors.first_name?.message}
            />
            <Input
              label="Last name"
              {...register('last_name')}
              error={errors.last_name?.message}
            />
          </div>

          <div>
            <label
              htmlFor="gender"
              className="mb-1.5 block text-sm font-medium text-text-primary"
            >
              Gender
            </label>
            <div className="relative">
              <select
                id="gender"
                className={clsx(
                  fieldClassName,
                  'appearance-none pr-10',
                )}
                {...register('gender')}
              >
                {Object.values(Gender).map((g) => (
                  <option key={g} value={g}>
                    {formatGenderLabel(g)}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
                aria-hidden="true"
              />
            </div>
          </div>
        </FormSection>

        <FormSection icon={CalendarDays} title="Dates & places">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Birth date"
              type="date"
              max={todayInputDate()}
              {...register('birth_date')}
              error={errors.birth_date?.message}
            />
            <Input
              label="Death date"
              type="date"
              max={todayInputDate()}
              {...register('death_date')}
              error={errors.death_date?.message}
            />
          </div>
          <Input
            label="Birth place"
            placeholder="City, Country"
            {...register('birth_place')}
          />
          <Input
            label="Current place"
            placeholder="City, Country"
            {...register('current_place')}
          />
        </FormSection>

        <FormSection icon={HeartPulse} title="Health note">
          <textarea
            {...register('health_note')}
            placeholder="Any relevant health information..."
            rows={3}
            className={clsx(
              fieldClassName,
              'resize-y placeholder:text-text-muted',
            )}
          />
        </FormSection>
      </div>

      <div className="shrink-0 border-t border-border-subtle bg-gradient-to-t from-warm-50/80 to-white px-5 py-4 backdrop-blur-md sm:px-6">
        <Button type="submit" loading={loading} className="w-full" size="lg">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

export function personToFormValues(
  person: Person | TreePersonNode,
): PersonFormValues {
  return {
    first_name: person.first_name,
    last_name: person.last_name,
    gender: person.gender,
    birth_date: person.birth_date ?? '',
    death_date: person.death_date ?? '',
    birth_place: person.birth_place ?? '',
    current_place: person.current_place ?? '',
    health_note: person.health_note ?? '',
  };
}
