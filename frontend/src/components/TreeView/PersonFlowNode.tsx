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

  return (
    <div
      data-tree-node-card
      style={{ width: PEDIGREE_NODE_WIDTH, minHeight: PEDIGREE_NODE_HEIGHT }}
      className={clsx(
        "group relative cursor-pointer rounded-[28px] border px-7 pb-7 pt-8 text-center transition-all duration-200",
        "shadow-[0_1px_2px_rgba(31,41,35,0.04),0_20px_45px_rgba(31,41,35,0.08)]",
        "hover:-translate-y-0.5 hover:shadow-[0_24px_52px_rgba(31,41,35,0.12)]",
        theme.card,
        highlighted ? theme.cardHighlighted : theme.cardHoverBorder,
        assistantHighlighted && "pt-10",
      )}
    >
      {assistantHighlighted && (
        <div className="absolute left-1/2 top-0 z-10 flex h-5 -translate-x-1/2 -translate-y-1/2 items-center rounded-full bg-brand-600 px-3 text-[10px] font-extrabold uppercase leading-none tracking-normal text-white shadow-[0_5px_12px_rgba(5,150,105,0.22)]">
          FROM ASSISTANT
        </div>
      )}

      {theme.showDecorations && <PersonCardFemaleDecorations />}

      <Handle
        type="target"
        position={Position.Top}
        className="!-top-1.5 !h-3 !w-3 !border-2 !border-white !bg-[#b8c2ad] !opacity-100"
      />
      <div className="flex flex-col items-center text-center">
        <div
          className={clsx(
            "relative rounded-full p-2 transition-all duration-200",
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
        <div className="mt-5 w-full">
          <p
            data-tree-node-label
            className="truncate font-serif text-3xl leading-none text-text-primary capitalize"
            title={person.first_name}
          >
            {person.first_name}
          </p>
          {lastName && (
            <p
              data-tree-node-years
              className={clsx(
                "mt-2 truncate font-serif text-xl leading-none capitalize",
                theme.lastName,
              )}
              title={lastName}
            >
              {lastName}
            </p>
          )}
          {theme.showHeartDivider && <PersonCardHeartDivider />}
          {birthYear && (
            <div
              className={clsx(
                "mt-5 inline-flex h-9 items-center gap-2 rounded-full px-5 text-base font-bold",
                theme.birthBadge,
              )}
            >
              <CalendarDays className="h-4 w-4 stroke-[1.8]" />
              <span className="tabular-nums">B. {birthYear}</span>
            </div>
          )}
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!-bottom-1.5 !h-3 !w-3 !border-2 !border-white !bg-[#c4ccc0] !opacity-100"
      />
    </div>
  );
}

export const PersonFlowNode = memo(PersonFlowNodeComponent);
