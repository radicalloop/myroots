import { Gender } from '../../../types/common.types';

export interface ImportSchemaNode {
  id: string;
  name: string;
  gender?: string;
  parents?: ImportSchemaNode[];
  children?: ImportSchemaChildNode[];
}

export interface ImportSchemaChildNode extends ImportSchemaNode {
  unassigned_descendants_by_generation?: Record<
    string,
    ImportSchemaPersonRef[]
  >;
}

export interface ImportSchemaPersonRef {
  id: string;
  name: string;
  gender?: string;
}

export interface FamilyTreeImportSchema {
  schema_version?: string;
  proband: ImportSchemaNode;
}

export interface ImportPersonRecord {
  externalId: string;
  firstName: string;
  lastName: string;
  gender: Gender;
  parentExternalId: string | null;
  isRoot: boolean;
}

export interface ImportExecutionResult {
  created: number;
  skipped: number;
  skippedOtherRelatives: number;
}
