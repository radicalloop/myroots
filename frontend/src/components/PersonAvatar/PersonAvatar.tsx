import { useEffect, useState } from "react";
import clsx from "clsx";
import { usePersonImageUrl } from "@/hooks/api/usePersonImageUrl";
import { Skeleton } from "@/components/ui/Skeleton";

type PersonAvatarVariant = "default" | "female";

interface PersonAvatarProps {
  treeId: string;
  personId: string;
  firstName: string;
  lastName: string;
  profileImagePath: string | null;
  size?: "sm" | "md" | "lg" | "xl" | "tree";
  variant?: PersonAvatarVariant;
}

const sizeClasses = {
  sm: "h-12 w-12 text-sm",
  md: "h-16 w-16 text-base",
  lg: "h-24 w-24 text-lg",
  xl: "h-28 w-28 text-2xl",
  tree: "h-28 w-28 text-4xl",
};

export function PersonAvatar({
  treeId,
  personId,
  firstName,
  lastName,
  profileImagePath,
  size = "sm",
  variant = "default",
}: PersonAvatarProps) {
  const [imageError, setImageError] = useState(false);

  const {
    data: imageUrl,
    isError,
    isLoading,
    isFetching,
  } = usePersonImageUrl({
    treeId,
    personId,
    profileImagePath,
  });

  useEffect(() => {
    setImageError(false);
  }, [profileImagePath, imageUrl]);

  const initials =
    size === "tree"
      ? (firstName[0] ?? "").toUpperCase()
      : `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
  const showImage =
    Boolean(profileImagePath) && Boolean(imageUrl) && !imageError && !isError;

  if ((isLoading || isFetching) && profileImagePath && !imageUrl) {
    return <Skeleton className={clsx("!rounded-full", sizeClasses[size])} />;
  }

  if (showImage && imageUrl) {
    return (
      <img
        data-tree-avatar
        src={imageUrl}
        alt={`${firstName} ${lastName}`}
        crossOrigin="anonymous"
        className={clsx(
          "rounded-full object-cover ring-2 ring-white shadow-sm",
          sizeClasses[size],
        )}
        onError={() => setImageError(true)}
      />
    );
  }

  return (
    <div
      data-tree-avatar
      className={clsx(
        "flex items-center justify-center rounded-full font-semibold",
        size === "tree" && variant === "female"
          ? "bg-white font-serif text-pink-500"
          : size === "tree"
            ? "bg-white font-serif text-brand-700"
            : "bg-gradient-to-br from-brand-100 to-brand-200 text-brand-700 shadow-sm ring-2 ring-white",
        sizeClasses[size],
      )}
    >
      {initials}
    </div>
  );
}
