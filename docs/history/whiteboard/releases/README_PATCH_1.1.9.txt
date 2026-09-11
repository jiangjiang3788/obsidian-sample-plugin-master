ThinkOS Whiteboard 1.1.9 PATCH

Base: ThinkOS 1.1.8 R2 Whiteboard Canvas Selection
Target: ThinkOS 1.1.9

Scope only:
- durable Archive / Restore for Whiteboard Projection, preserving original world x/y/zIndex/groupId
- archived Record remains excluded from Record Source; canonical Record is never deleted
- incident edges suspend in archivedEdges and restore only when both endpoints are active
- right-top archive box with Restore
- multi-selection can archive as one Store mutation
- “回到画布中心” now resets viewport to content center + 100% zoom atomically
- version metadata 1.1.9
- all new/updated version documents are under doc/

Not included:
- 1.1.10 viewport culling / spatial optimization
- AI changes
- permanent deletion of canonical Records

Apply this PATCH over the 1.1.8 R2 SOURCE/PATCH result. Full 1.1.9 SOURCE is also supplied.
