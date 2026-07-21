import { memo } from "react";
import clsx from "clsx";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { CalendarDays } from "lucide-react";
import { PersonAvatar } from "@/components/PersonAvatar/PersonAvatar";
import { PersonNodeData } from "./layoutTree";
import { PEDIGREE_NODE_HEIGHT, PEDIGREE_NODE_WIDTH } from "./pedigreeLayout";
import { getPersonCardTheme } from "./person-card-theme";
import {
  PersonCardFemaleDecorations,
  PersonCardHeartDivider,
} from "./PersonCardDecorations";

function PersonFlowNodeComponent({ data }: NodeProps) {
  const nodeData = data as PersonNodeData;
  const { person, highlighted, assistantHighlighted } = nodeData;
  const lastName = person.last_name === "-" ? "" : person.last_name;
  const birthYear = person.birth_date?.slice(0, 4);
  const theme = getPersonCardTheme(person.gender);
  const inCouple = Boolean(person.spouse);
  const showHeartDivider = theme.showHeartDivider;
  const showHeartDividerSlot = showHeartDivider || inCouple;

  return (
    <div
      style={{ width: PEDIGREE_NODE_WIDTH, height: PEDIGREE_NODE_HEIGHT }}
      className="relative"
    >
      {assistantHighlighted && (
        <div className="pointer-events-none absolute left-1/2 top-0 z-20 flex h-6 -translate-x-1/2 -translate-y-1/2 items-center rounded-full bg-brand-600 px-3 text-[10px] font-extrabold uppercase leading-none tracking-normal text-white shadow-[0_5px_12px_rgba(5,150,105,0.22)]">
          FROM ASSISTANT
        </div>
      )}

      <div
        data-tree-node-card
        className={clsx(
          "group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-[28px] border px-7 pb-7 pt-8 text-center transition-all duration-200",
          "shadow-[0_1px_2px_rgba(31,41,35,0.04),0_20px_45px_rgba(31,41,35,0.08)]",
          "hover:-translate-y-0.5 hover:shadow-[0_24px_52px_rgba(31,41,35,0.12)]",
          theme.card,
          highlighted ? theme.cardHighlighted : theme.cardHoverBorder,
          assistantHighlighted && "pt-10",
        )}
      >
        {theme.showDecorations && <PersonCardFemaleDecorations />}

        <Handle
          type="target"
          position={Position.Top}
          className="!-top-1.5 !h-3 !w-3 !border-2 !border-white !bg-[#b8c2ad] !opacity-100"
        />
        <div className="flex flex-1 flex-col items-center text-center">
          <div
            className={clsx(
              "relative shrink-0 rounded-full p-2 transition-all duration-200",
              theme.ring,
              highlighted ? theme.ringHighlighted : theme.ringHover,
            )}
          >
            <PersonAvatar
              treeId={person.tree_id}
              personId={person.id}
              firstName={person.first_name}
              lastName={person.last_name}
              profileImagePath={person.profile_image_path}
              size="tree"
              variant={theme.avatarVariant}
            />
            <span
              className={clsx(
                "absolute bottom-5 right-2 h-4 w-4 rounded-full border-2 border-white shadow-sm",
                theme.statusDot,
              )}
            />
          </div>
          <div className="mt-5 flex w-full flex-1 flex-col items-center">
            <div className="flex w-full shrink-0 flex-col items-center">
              <p
                data-tree-node-label
                className="w-full truncate font-serif text-3xl leading-none text-text-primary capitalize"
                title={person.first_name}
              >
                {person.first_name}
              </p>
              <p
                data-tree-node-years
                className={clsx(
                  "mt-2 w-full truncate font-serif text-xl leading-none capitalize",
                  theme.lastName,
                  !lastName && "invisible",
                )}
                title={lastName || undefined}
              >
                {lastName || "\u00a0"}
              </p>
              {showHeartDividerSlot && (
                <PersonCardHeartDivider invisible={!showHeartDivider} />
              )}
            </div>
            <div className="flex-1" aria-hidden="true" />
            <div className="flex w-full shrink-0 justify-center pt-5">
              {birthYear ? (
                <div
                  className={clsx(
                    "inline-flex h-9 items-center gap-2 rounded-full px-5 text-base font-bold",
                    theme.birthBadge,
                  )}
                >
                  <CalendarDays className="h-4 w-4 stroke-[1.8]" />
                  <span className="tabular-nums">B. {birthYear}</span>
                </div>
              ) : (
                <div className="h-9" aria-hidden="true" />
              )}
            </div>
          </div>
        </div>
        <Handle
          type="source"
          position={Position.Bottom}
          className="!-bottom-1.5 !h-3 !w-3 !border-2 !border-white !bg-[#c4ccc0] !opacity-100"
        />
      </div>
    </div>
  );
}

export const PersonFlowNode = memo(PersonFlowNodeComponent);
