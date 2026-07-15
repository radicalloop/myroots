import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ReactFlow,
  Background,
  MiniMap,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { TreePine } from "lucide-react";
import { TreePersonNode } from "@/types/api.types";
import { downloadTreeAsPdf } from "@/utils/download-tree-pdf";
import { useTreePublicContext } from "@/contexts/TreePublicContext";
import { treeToFlowElements, PersonNodeData } from "./layoutTree";
import { PersonFlowNode } from "./PersonFlowNode";
import { FamilyUnitNode } from "./FamilyUnitNode";
import { CoupleHeartNode } from "./CoupleHeartNode";
import { PedigreeEdge } from "./PedigreeEdge";
import { SpouseConnector } from "./SpouseConnector";
import { PEDIGREE_NODE_HEIGHT, PEDIGREE_NODE_WIDTH } from "./pedigreeLayout";
import { TreeZoomControls } from "./TreeZoomControls";
import {
  CHAT_FOCUS_NODE_EVENT,
  ChatFocusNodeEventDetail,
} from "@/utils/chat-focus-events";
import { EmptyState } from "@/components/ui/EmptyState";

const nodeTypes = {
  personNode: PersonFlowNode,
  familyUnit: FamilyUnitNode,
  coupleHeart: CoupleHeartNode,
};
const edgeTypes = { pedigree: PedigreeEdge, spouseConnector: SpouseConnector };
const CENTER_INITIAL_ZOOM = 0.72;

export interface FamilyTreeViewHandle {
  downloadPdf: (treeName: string) => Promise<void>;
  focusPerson: (personId: string) => void;
}

interface FamilyTreeViewProps {
  root: TreePersonNode | null;
  onNodeClick: (person: TreePersonNode) => void;
  immersive?: boolean;
  centerOnInitialLoad?: boolean;
  emptyStateAction?: {
    label: string;
    onClick: () => void;
    className?: string;
  };
}

interface TreeFlowProps {
  root: TreePersonNode;
  onNodeClick: (person: TreePersonNode) => void;
  exportRef: React.Ref<FamilyTreeViewHandle>;
  immersive?: boolean;
  centerOnInitialLoad?: boolean;
}

function TreeFlow({
  root,
  onNodeClick,
  exportRef,
  immersive,
  centerOnInitialLoad = false,
}: TreeFlowProps) {
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const publicInitialViewAppliedRef = useRef(false);
  const [pendingFocusNodeId, setPendingFocusNodeId] = useState<string | null>(
    null,
  );
  const [pendingFocusSource, setPendingFocusSource] =
    useState<ChatFocusNodeEventDetail["source"]>(undefined);
  const { getNodes, getNode, setCenter } = useReactFlow();
  const { isPublic } = useTreePublicContext();
  const { nodes: layoutNodes, edges: layoutEdges } = useMemo(
    () => treeToFlowElements(root),
    [root],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutEdges);

  useEffect(() => {
    setNodes(layoutNodes);
    setEdges(layoutEdges);
    publicInitialViewAppliedRef.current = false;
  }, [layoutNodes, layoutEdges, setNodes, setEdges]);

  useEffect(() => {
    if (
      (!isPublic && !centerOnInitialLoad) ||
      publicInitialViewAppliedRef.current
    ) {
      return;
    }

    const personNodes = nodes.filter((node) => node.type === "personNode");
    if (personNodes.length === 0) return;

    const minX = Math.min(...personNodes.map((node) => node.position.x));
    const maxX = Math.max(
      ...personNodes.map((node) => node.position.x + PEDIGREE_NODE_WIDTH),
    );
    const minY = Math.min(...personNodes.map((node) => node.position.y));
    const maxY = Math.max(
      ...personNodes.map((node) => node.position.y + PEDIGREE_NODE_HEIGHT),
    );

    publicInitialViewAppliedRef.current = true;
    const frameId = requestAnimationFrame(() => {
      setCenter((minX + maxX) / 2, (minY + maxY) / 2, {
        duration: 0,
        zoom: CENTER_INITIAL_ZOOM,
      });
    });

    return () => cancelAnimationFrame(frameId);
  }, [centerOnInitialLoad, isPublic, nodes, setCenter]);

  const clearHighlight = useCallback(() => {
    setNodes((currentNodes) =>
      currentNodes.map((node) => ({
        ...node,
        data: {
          ...(node.data as PersonNodeData),
          highlighted: false,
          assistantHighlighted: false,
        },
      })),
    );
  }, [setNodes]);

  const focusPerson = useCallback(
    (
      personId: string,
      options?: { source?: ChatFocusNodeEventDetail["source"] },
    ) => {
      const targetNode = getNode(personId);
      if (!targetNode) return;
      const fromAssistant = options?.source === "assistant";

      const targetX =
        targetNode.position.x + (targetNode.width ?? PEDIGREE_NODE_WIDTH) / 2;
      const targetY =
        targetNode.position.y + (targetNode.height ?? PEDIGREE_NODE_HEIGHT) / 2;

      setCenter(targetX, targetY, { duration: 700, zoom: 1 });

      setNodes((currentNodes) =>
        currentNodes.map((node) => ({
          ...node,
          data: {
            ...(node.data as PersonNodeData),
            highlighted: node.id === personId,
            assistantHighlighted: fromAssistant && node.id === personId,
          },
        })),
      );

      if (highlightTimeoutRef.current)
        clearTimeout(highlightTimeoutRef.current);
      highlightTimeoutRef.current = null;
      if (!fromAssistant) {
        highlightTimeoutRef.current = setTimeout(() => {
          clearHighlight();
          highlightTimeoutRef.current = null;
        }, 2500);
      }
    },
    [clearHighlight, getNode, setCenter, setNodes],
  );

  useEffect(() => {
    const handleFocusEvent = (event: Event) => {
      const customEvent = event as CustomEvent<ChatFocusNodeEventDetail>;
      if (customEvent.detail.treeId !== root.tree_id) return;
      setPendingFocusNodeId(customEvent.detail.personId);
      setPendingFocusSource(customEvent.detail.source);
    };
    window.addEventListener(CHAT_FOCUS_NODE_EVENT, handleFocusEvent);
    return () =>
      window.removeEventListener(CHAT_FOCUS_NODE_EVENT, handleFocusEvent);
  }, [root.tree_id]);

  useEffect(() => {
    if (!pendingFocusNodeId || !getNode(pendingFocusNodeId)) return;
    focusPerson(pendingFocusNodeId, { source: pendingFocusSource });
    setPendingFocusNodeId(null);
    setPendingFocusSource(undefined);
  }, [focusPerson, getNode, nodes, pendingFocusNodeId, pendingFocusSource]);

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current)
        clearTimeout(highlightTimeoutRef.current);
    };
  }, []);

  useImperativeHandle(exportRef, () => ({
    downloadPdf: async (name: string) => {
      await downloadTreeAsPdf(getNodes(), name, { isPublic });
    },
    focusPerson,
  }));

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const data = node.data as PersonNodeData;
      if (data?.person) {
        onNodeClick(data.person);
      }
    },
    [onNodeClick],
  );

  return (
    <div
      className={
        immersive
          ? "h-full w-full overflow-hidden rounded-[22px] border border-border-soft bg-white shadow-[0_1px_2px_rgba(31,41,35,0.04)]"
          : "h-full w-full overflow-hidden rounded-[var(--radius-card)] border border-border-soft bg-gradient-to-br from-warm-50 via-white to-brand-50/30 shadow-[var(--shadow-card)]"
      }
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        fitView
        fitViewOptions={{ padding: 0.18, minZoom: 0.08, maxZoom: 1.2 }}
        minZoom={0.05}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          gap={immersive ? 28 : 20}
          color={immersive ? "#d4d8d2" : "#e8eaed"}
          size={1}
        />
        <TreeZoomControls />
        {!immersive && (
          <MiniMap
            zoomable
            pannable
            nodeColor="#d1fae5"
            maskColor="rgba(248, 249, 250, 0.7)"
            className="!rounded-2xl"
          />
        )}
      </ReactFlow>
    </div>
  );
}

export const FamilyTreeView = forwardRef<
  FamilyTreeViewHandle,
  FamilyTreeViewProps
>(function FamilyTreeView({
  root,
  onNodeClick,
  immersive = false,
  centerOnInitialLoad = false,
  emptyStateAction,
}, ref) {
  if (!root) {
    return (
      <div
        className={
          immersive
            ? "flex h-full items-center justify-center rounded-[22px] border border-border-soft bg-white shadow-[0_1px_2px_rgba(31,41,35,0.04)]"
            : "flex h-full items-center justify-center rounded-[var(--radius-card)] border border-dashed border-border-soft bg-white"
        }
      >
        <EmptyState
          icon={<TreePine className="h-8 w-8" />}
          title="Start your family tree"
          description="Add the first person to begin mapping your family heritage and building connections across generations."
          action={emptyStateAction}
        />
      </div>
    );
  }

  return (
    <ReactFlowProvider>
      <TreeFlow
        root={root}
        onNodeClick={onNodeClick}
        exportRef={ref}
        immersive={immersive}
        centerOnInitialLoad={centerOnInitialLoad}
      />
    </ReactFlowProvider>
  );
});
