export function getDirectedEdges({ nodes, links }) {
    const edges = [];

    for (const node of nodes) {
        if (node.reflexive) {
            edges.push({ from: node.id, to: node.id, weight: 1 });
        }
    }

    for (const link of links) {
        const weight = link.weight ?? 1;
        const source = link.source;
        const target = link.target;

        if (link.right) {
            edges.push({ from: source, to: target, weight });
        }
        if (link.left) {
            edges.push({ from: target, to: source, weight });
        }
    }

    return edges;
}

export function buildAdjacencyList(graph) {
    const { nodes, links } = graph;
    const adjacency = {};

    for (const node of nodes) {
        adjacency[node.id] = [];
    }

    for (const edge of getDirectedEdges({ nodes, links })) {
        const neighbors = adjacency[edge.from];
        const existing = neighbors.find((item) => item.id === edge.to);
        if (existing) {
            existing.weight = edge.weight;
        } else {
            neighbors.push({ id: edge.to, weight: edge.weight });
        }
    }

    return [...nodes]
        .sort((a, b) => a.id - b.id)
        .map((node) => ({
            id: node.id,
            neighbors: [...adjacency[node.id]].sort((a, b) => a.id - b.id),
        }));
}

export function buildAdjacencyMatrix(graph) {
    const { nodes, links, allowWeight } = graph;
    const vertexIds = [...nodes].map((node) => node.id).sort((a, b) => a - b);
    const matrix = {};

    for (const row of vertexIds) {
        matrix[row] = {};
        for (const col of vertexIds) {
            matrix[row][col] = 0;
        }
    }

    for (const edge of getDirectedEdges({ nodes, links })) {
        matrix[edge.from][edge.to] = allowWeight ? edge.weight : 1;
    }

    return { vertexIds, matrix };
}

export function buildEdgeList(graph) {
    return getDirectedEdges(graph).sort((a, b) => {
        if (a.from !== b.from) return a.from - b.from;
        return a.to - b.to;
    });
}
