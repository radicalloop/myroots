import {
  Clock,
  CircleHelp,
  LucideIcon,
  Pencil,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";

export const DEFAULT_ACTIONS = [
  {
    label: "Add person",
    icon: Plus,
    message:
      "Add a person:\nFirst name: \nLast name: \nGender: \nWhere to add: \nRelationship: child / parent / spouse",
  },
  {
    label: "Edit details",
    icon: Pencil,
    message:
      "Edit details:\nPerson to edit: \nWhat detail should change: \nNew value: ",
  },
  {
    label: "Find someone",
    icon: Search,
    message: "Find someone:\nName or clue: ",
  },
] as const;

export interface DefaultQuestion {
  label: string;
  message: string;
  icon: LucideIcon;
  highlighted?: boolean;
}

export const DEFAULT_QUESTIONS: DefaultQuestion[] = [
  {
    label: "Who are my oldest known ancestors?",
    message: "Who are my oldest known ancestors?",
    icon: Sparkles,
    highlighted: true,
  },
  {
    label: "Tell me about my family history",
    message: "Tell me about my family history",
    icon: Clock,
  },
  {
    label: "Help me find missing details",
    message: "Help me find missing family details",
    icon: CircleHelp,
  },
];
