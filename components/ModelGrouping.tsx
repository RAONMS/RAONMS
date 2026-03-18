'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';

interface GroupNode {
    id: string;
    name: string;
    type: 'group' | 'model';
    children?: GroupNode[];
}

interface ModelGroupingProps {
    models: string[];
    onGroupsChange?: (hierarchy: GroupNode[]) => void;
}

const STORAGE_KEY = 'rsp_model_hierarchy_v1';

export default function ModelGrouping({ models, onGroupsChange }: ModelGroupingProps) {
    const [hierarchy, setHierarchy] = useState<GroupNode[]>([]);
    const [selectedPath, setSelectedPath] = useState<string[]>([]); // Array of IDs representing the navigation path
    const [draggedNode, setDraggedNode] = useState<{ id: string; type: 'group' | 'model' } | null>(null);
    const [creatingIn, setCreatingIn] = useState<string | null>(null); // Parent ID where new folder is being created
    const [newFolderName, setNewFolderName] = useState('');

    // Initial Load & Sync with master models list
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        let currentHierarchy: GroupNode[] = [];
        
        if (saved) {
            try {
                currentHierarchy = JSON.parse(saved);
            } catch (e) {
                console.error('Failed to parse hierarchy', e);
            }
        }

        const getAllModels = (nodes: GroupNode[]): Set<string> => {
            const found = new Set<string>();
            nodes.forEach(node => {
                if (node.type === 'model') found.add(node.name);
                if (node.children) {
                    getAllModels(node.children).forEach(m => found.add(m));
                }
            });
            return found;
        };

        const existingModels = getAllModels(currentHierarchy);
        const newModels = models.filter(m => !existingModels.has(m));

        if (newModels.length > 0) {
            const ungroupedNodes: GroupNode[] = newModels.map(m => ({
                id: `model-${m}`,
                name: m,
                type: 'model'
            }));
            
            let ungroupedFolder = currentHierarchy.find(n => n.id === 'group-ungrouped');
            if (ungroupedFolder) {
                ungroupedFolder.children = [...(ungroupedFolder.children || []), ...ungroupedNodes];
            } else {
                currentHierarchy.push({
                    id: 'group-ungrouped',
                    name: 'Ungrouped',
                    type: 'group',
                    children: ungroupedNodes
                });
            }
        }

        setHierarchy(currentHierarchy);
    }, [models]);

    useEffect(() => {
        if (hierarchy.length > 0) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(hierarchy));
            if (onGroupsChange) onGroupsChange(hierarchy);
        }
    }, [hierarchy, onGroupsChange]);

    const confirmAddFolder = () => {
        if (!newFolderName.trim()) {
            setCreatingIn(null);
            return;
        }

        const newFolder: GroupNode = {
            id: `group-${Date.now()}`,
            name: newFolderName.trim(),
            type: 'group',
            children: []
        };

        if (creatingIn === 'root') {
            setHierarchy([...hierarchy, newFolder]);
        } else {
            const update = (nodes: GroupNode[]): GroupNode[] => {
                return nodes.map(node => {
                    if (node.id === creatingIn) return { ...node, children: [...(node.children || []), newFolder] };
                    if (node.children) return { ...node, children: update(node.children) };
                    return node;
                });
            };
            setHierarchy(update(hierarchy));
        }
        setCreatingIn(null);
        setNewFolderName('');
    };

    const handleDelete = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this? Models will be moved to Ungrouped.')) return;
        
        let modelsToRescue: GroupNode[] = [];
        const findAndRemove = (nodes: GroupNode[]): GroupNode[] => {
            return nodes.filter(node => {
                if (node.id === id) {
                    const collect = (n: GroupNode) => {
                        if (n.type === 'model') modelsToRescue.push(n);
                        if (n.children) n.children.forEach(collect);
                    };
                    collect(node);
                    return false;
                }
                if (node.children) node.children = findAndRemove(node.children);
                return true;
            });
        };

        const newHierarchy = findAndRemove(hierarchy);
        if (modelsToRescue.length > 0) {
            const ungroupedIdx = newHierarchy.findIndex(n => n.id === 'group-ungrouped');
            if (ungroupedIdx !== -1) {
                newHierarchy[ungroupedIdx].children = [...(newHierarchy[ungroupedIdx].children || []), ...modelsToRescue];
            } else {
                newHierarchy.push({
                    id: 'group-ungrouped',
                    name: 'Ungrouped',
                    type: 'group',
                    children: modelsToRescue
                });
            }
        }
        setHierarchy([...newHierarchy]);
        setSelectedPath(prev => prev.filter(pId => pId !== id));
    };

    const onDragStart = (e: React.DragEvent, id: string, type: 'group' | 'model') => {
        setDraggedNode({ id, type });
        e.dataTransfer.setData('nodeId', id);
        e.stopPropagation();
    };

    const onDrop = (e: React.DragEvent, targetId: string | null) => {
        e.preventDefault();
        e.stopPropagation();
        const nodeId = e.dataTransfer.getData('nodeId');
        if (!nodeId || nodeId === targetId) return;

        const isDescendant = (parent: GroupNode, targetId: string): boolean => {
            if (parent.children) {
                for (const child of parent.children) {
                    if (child.id === targetId) return true;
                    if (isDescendant(child, targetId)) return true;
                }
            }
            return false;
        };

        let movingNode: GroupNode | null = null;
        const removeNode = (nodes: GroupNode[]): GroupNode[] => {
            return nodes.filter(node => {
                if (node.id === nodeId) {
                    movingNode = node;
                    return false;
                }
                if (node.children) node.children = removeNode(node.children);
                return true;
            });
        };

        const findNode = (nodes: GroupNode[], id: string): GroupNode | null => {
            for (const n of nodes) {
                if (n.id === id) return n;
                if (n.children) {
                    const found = findNode(n.children, id);
                    if (found) return found;
                }
            }
            return null;
        };

        const sourceNode = findNode(hierarchy, nodeId);
        if (sourceNode && targetId && isDescendant(sourceNode, targetId)) {
            alert("Cannot move a folder into its own subfolder.");
            return;
        }

        const filtered = removeNode([...hierarchy]);
        if (!movingNode) return;

        if (targetId === null) {
            setHierarchy([...filtered, movingNode]);
        } else {
            const insertGroup = (nodes: GroupNode[]): GroupNode[] => {
                return nodes.map(node => {
                    if (node.id === targetId && node.type === 'group') {
                        return { ...node, children: [...(node.children || []), movingNode!], isOpen: true };
                    }
                    if (node.children) return { ...node, children: insertGroup(node.children) };
                    return node;
                });
            };
            setHierarchy(insertGroup(filtered));
        }
        setDraggedNode(null);
    };

    const getColumnNodes = useCallback((parentId: string | null): GroupNode[] => {
        if (parentId === null) return hierarchy;
        
        const findChildren = (nodes: GroupNode[]): GroupNode[] | null => {
            for (const node of nodes) {
                if (node.id === parentId) return node.children || [];
                if (node.children) {
                    const found = findChildren(node.children);
                    if (found) return found;
                }
            }
            return null;
        };
        return findChildren(hierarchy) || [];
    }, [hierarchy]);

    const handleNodeClick = (node: GroupNode, colIndex: number) => {
        if (node.type === 'group') {
            const newPath = selectedPath.slice(0, colIndex);
            newPath.push(node.id);
            setSelectedPath(newPath);
        } else {
            const newPath = selectedPath.slice(0, colIndex);
            setSelectedPath(newPath);
        }
    };

    const columns = useMemo(() => {
        const cols = [getColumnNodes(null)];
        selectedPath.forEach(id => {
            cols.push(getColumnNodes(id));
        });
        return cols;
    }, [selectedPath, getColumnNodes]);

    return (
        <div className="hierarchy-container">
            <div className="hierarchy-header">
                <div>
                    <h2>Product Hierarchy Explorer</h2>
                    <p className="subtitle">Column view navigation (Mac-style)</p>
                </div>
                <button className="btn btn-primary" onClick={() => { setCreatingIn('root'); setNewFolderName(''); }}>
                    + New Root Folder
                </button>
            </div>
            
            <div className="hierarchy-hint">
                Click folders to navigate. Drag items between columns to organize.
            </div>

            <div className="column-container">
                {columns.map((nodes, colIndex) => (
                    <div 
                        key={colIndex} 
                        className="column"
                        onDragOver={(e) => { e.preventDefault(); }}
                        onDrop={(e) => onDrop(e, colIndex === 0 ? null : selectedPath[colIndex - 1])}
                    >
                        {nodes.map(node => {
                            const isSelected = selectedPath[colIndex] === node.id;
                            const isGroup = node.type === 'group';
                            
                            return (
                                <div 
                                    key={node.id}
                                    className={`node-item ${isSelected ? 'selected' : ''} ${isGroup ? 'group' : 'model'} ${draggedNode?.id === node.id ? 'dragging' : ''}`}
                                    onClick={() => handleNodeClick(node, colIndex)}
                                    draggable
                                    onDragStart={(e) => onDragStart(e, node.id, node.type)}
                                    onDragOver={(e) => { if (isGroup) { e.preventDefault(); e.stopPropagation(); } }}
                                    onDrop={(e) => { if (isGroup) onDrop(e, node.id); }}
                                >
                                    <div className="node-content">
                                        <div className="node-info">
                                            {isGroup && (
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px', color: '#64748b', flexShrink: 0 }}>
                                                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                                                </svg>
                                            )}
                                            <span className="name">{node.name}</span>
                                            {isGroup && <span className="count">{node.children?.length || 0}</span>}
                                        </div>
                                        <div className="node-meta">
                                            <div className="actions">
                                                {isGroup && (
                                                    <button 
                                                        className="mini-btn add" 
                                                        onClick={(e) => { e.stopPropagation(); setCreatingIn(node.id); }}
                                                        title="Add Subfolder"
                                                    >+</button>
                                                )}
                                                {node.id !== 'group-ungrouped' && (
                                                    <button 
                                                        className="mini-btn del" 
                                                        onClick={(e) => handleDelete(node.id, e)}
                                                        title="Delete"
                                                    >×</button>
                                                )}
                                            </div>
                                            {isGroup && <span className="arrow">›</span>}
                                        </div>
                                    </div>
                                    
                                    {creatingIn === node.id && (
                                        <div className="inline-input-container" onClick={e => e.stopPropagation()}>
                                            <input 
                                                autoFocus
                                                placeholder="Subfolder..."
                                                value={newFolderName}
                                                onChange={(e) => setNewFolderName(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') confirmAddFolder();
                                                    if (e.key === 'Escape') setCreatingIn(null);
                                                }}
                                                onBlur={confirmAddFolder}
                                            />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        
                        {creatingIn === (colIndex === 0 ? 'root' : selectedPath[colIndex-1]) && (
                            <div className="node-item new-folder-input" onClick={e => e.stopPropagation()}>
                                <input 
                                    autoFocus
                                    placeholder="New folder..."
                                    value={newFolderName}
                                    onChange={(e) => setNewFolderName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') confirmAddFolder();
                                        if (e.key === 'Escape') setCreatingIn(null);
                                    }}
                                    onBlur={confirmAddFolder}
                                />
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <style jsx>{`
                .hierarchy-container {
                    background: white;
                    border-radius: 12px;
                    border: 1px solid var(--color-border);
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
                    padding: 24px;
                    height: 600px;
                    display: flex;
                    flex-direction: column;
                }
                .hierarchy-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 16px;
                }
                .hierarchy-header h2 { font-size: 1.25rem; font-weight: 700; color: #1e293b; margin: 0; }
                .subtitle { font-size: 0.85rem; color: #64748b; margin-top: 4px; }
                
                .hierarchy-hint {
                    font-size: 0.85rem;
                    color: #475569;
                    margin-bottom: 20px;
                    padding: 8px 12px;
                    background: #f1f5f9;
                    border-radius: 6px;
                }

                .column-container {
                    flex: 1;
                    display: flex;
                    overflow-x: auto;
                    border: 1px solid #e2e8f0;
                    border-radius: 10px;
                    background: #fafafa;
                }

                .column {
                    width: 260px;
                    min-width: 260px;
                    border-right: 1px solid #e2e8f0;
                    overflow-y: auto;
                    padding: 8px;
                    background: white;
                }
                .column:last-child { border-right: none; }

                .node-item {
                    border-radius: 6px;
                    margin-bottom: 2px;
                    cursor: pointer;
                    transition: all 0.15s ease;
                    border: 1px solid transparent;
                    position: relative;
                }
                .node-item:hover { background: #f1f5f9; }
                .node-item.selected { background: #e0e7ff; color: #4338ca; }
                .node-item.dragging { opacity: 0.4; }

                .node-content {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 8px 10px;
                }

                .node-info {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    flex: 1;
                    min-width: 0;
                }
                .icon { font-size: 16px; }
                .name { 
                    font-size: 13px; 
                    font-weight: 500; 
                    white-space: nowrap; 
                    overflow: hidden; 
                    text-overflow: ellipsis; 
                }
                .count { font-size: 10px; opacity: 0.5; margin-left: 4px; }

                .node-meta {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .arrow { font-size: 16px; font-weight: 300; opacity: 0.3; }

                .actions {
                    display: none;
                    gap: 4px;
                }
                .node-item:hover .actions { display: flex; }

                .mini-btn {
                    width: 20px;
                    height: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 4px;
                    border: 1px solid #e2e8f0;
                    background: white;
                    font-size: 12px;
                    cursor: pointer;
                    color: #64748b;
                    transition: all 0.2s;
                }
                .mini-btn:hover { border-color: #4338ca; color: #4338ca; background: #eef2ff; }
                .mini-btn.del:hover { border-color: #fca5a5; color: #ef4444; background: #fef2f2; }

                .inline-input-container, .new-folder-input {
                    padding: 4px 8px;
                }
                .inline-input-container input, .new-folder-input input {
                    width: 100%;
                    padding: 6px 10px;
                    border-radius: 4px;
                    border: 1px solid #4338ca;
                    outline: none;
                    font-size: 12px;
                    box-shadow: 0 0 0 3px rgba(67, 56, 202, 0.1);
                }

                .btn-primary { 
                    padding: 8px 16px; 
                    font-size: 13px; 
                    font-weight: 600; 
                    border-radius: 8px;
                    background: #1e293b;
                    border: none;
                    color: white;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .btn-primary:hover { background: #334155; }
            `}</style>
        </div>
    );
}
