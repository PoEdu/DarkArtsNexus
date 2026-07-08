<template>
    <div class="graph-editor">
        <p v-if="!hideTitle">Graph Editor</p>
        <div v-if="allowWeight && selectedLinkInfo" class="link-toolbar">
            <span>已选边 {{ selectedLinkInfo.source }} → {{ selectedLinkInfo.target }}</span>
            <label class="weight-label">
                权重
                <input
                    type="number"
                    min="0"
                    step="1"
                    class="weight-input"
                    v-model.number="selectedLinkInfo.weight"
                    @change="applyWeightChange"
                />
            </label>
        </div>
        <p v-if="!directed" class="graph-hint">无向图：新边自动双向连接，方向快捷键已禁用</p>
        <p v-else-if="allowWeight" class="graph-hint">选中边后可编辑权重；L/R/B 切换方向，Delete 删除</p>
        <p v-else class="graph-hint">L/R/B 切换方向，Delete 删除，Ctrl+拖拽移动顶点</p>
        <svg ref="containerRef" :width="width" :height="height"></svg>
    </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref, watch } from 'vue';

const props = defineProps({
    width: {
        type: Number,
        default: 600,
    },
    height: {
        type: Number,
        default: 400,
    },
    hideTitle: {
        type: Boolean,
        default: false,
    },
    directed: {
        type: Boolean,
        default: true,
    },
    allowWeight: {
        type: Boolean,
        default: false,
    },
    highlights: {
        type: Object,
        default: null,
    },
    highlightEdges: {
        type: Array,
        default: () => [],
    },
});

const emit = defineEmits(['graph-change']);

const containerRef = ref(null);
const selectedLinkInfo = ref(null);

let selectedLinkObject = null;
let applyWeightChangeFn = null;
let applyHighlightsFn = null;

function edgeKey(a, b) {
    return a < b ? `${a}-${b}` : `${b}-${a}`;
}

watch(
    () => [props.highlights, props.highlightEdges],
    () => applyHighlightsFn?.(),
    { deep: true },
);

function applyWeightChange() {
    applyWeightChangeFn?.();
}

function loadScript(src) {
    return new Promise((resolve, reject) => {
        if (window.d3) {
            resolve(window.d3);
            return;
        }

        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = src;
        script.onload = () => resolve(window.d3);
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

function serializeGraph(nodes, links) {
    return {
        directed: props.directed,
        allowWeight: props.allowWeight,
        nodes: nodes.map((node) => ({
            id: node.id,
            reflexive: node.reflexive,
        })),
        links: links.map((link) => ({
            source: link.source.id,
            target: link.target.id,
            left: link.left,
            right: link.right,
            weight: props.allowWeight ? (link.weight ?? 1) : undefined,
        })),
    };
}

onMounted(async () => {
    const d3 = await loadScript('https://d3js.org/d3.v3.min.js');
    const svg = d3.select(containerRef.value);
    const width = props.width;
    const height = props.height;
    const colors = d3.scale.category10();
    const markerId = `graph-${Math.random().toString(36).slice(2, 9)}`;

    let nodes = [
        { id: 0, reflexive: false },
        { id: 1, reflexive: true },
        { id: 2, reflexive: false },
    ];
    let lastNodeId = 2;
    let links = [
        { source: nodes[0], target: nodes[1], left: false, right: true, weight: 1 },
        { source: nodes[1], target: nodes[2], left: false, right: true, weight: 1 },
    ];

    if (!props.directed) {
        for (const link of links) {
            link.left = true;
            link.right = true;
        }
    }

    const force = d3.layout.force()
        .nodes(nodes)
        .links(links)
        .size([width, height])
        .linkDistance(150)
        .charge(-500)
        .on('tick', tick);

    svg.append('svg:defs').append('svg:marker')
        .attr('id', `${markerId}-end-arrow`)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 6)
        .attr('markerWidth', 3)
        .attr('markerHeight', 3)
        .attr('orient', 'auto')
        .append('svg:path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', '#000');

    svg.append('svg:defs').append('svg:marker')
        .attr('id', `${markerId}-start-arrow`)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 4)
        .attr('markerWidth', 3)
        .attr('markerHeight', 3)
        .attr('orient', 'auto')
        .append('svg:path')
        .attr('d', 'M10,-5L0,0L10,5')
        .attr('fill', '#000');

    const dragLine = svg.append('svg:path')
        .attr('class', 'link dragline hidden')
        .attr('d', 'M0,0L0,0');

    let path = svg.append('svg:g').selectAll('path');
    let linkLabels = svg.append('svg:g').selectAll('text.link-weight');
    let circle = svg.append('svg:g').selectAll('g');

    let selectedNode = null;
    let selectedLink = null;
    let mousedownLink = null;
    let mousedownNode = null;
    let mouseupNode = null;
    let lastKeyDown = -1;

    function resetMouseVars() {
        mousedownNode = null;
        mouseupNode = null;
        mousedownLink = null;
    }

    function syncSelection() {
        if (selectedLink && props.allowWeight) {
            selectedLinkInfo.value = {
                source: selectedLink.source.id,
                target: selectedLink.target.id,
                weight: selectedLink.weight ?? 1,
            };
            selectedLinkObject = selectedLink;
        } else {
            selectedLinkInfo.value = null;
            selectedLinkObject = null;
        }
    }

    applyWeightChangeFn = () => {
        if (!selectedLinkObject || !selectedLinkInfo.value) return;
        selectedLinkObject.weight = Number(selectedLinkInfo.value.weight) || 1;
        restart();
    };

    applyHighlightsFn = () => {
        const states = props.highlights || {};
        svg.selectAll('circle.node')
            .classed('hl-current', (d) => d && states[d.id] === 'current')
            .classed('hl-visited', (d) => d && states[d.id] === 'visited')
            .classed('hl-frontier', (d) => d && states[d.id] === 'frontier');

        const edgeSet = new Set((props.highlightEdges || []).map((e) => edgeKey(e.from, e.to)));
        svg.selectAll('path.link')
            .classed('hl-edge', (d) => !!(d && d.source && edgeSet.has(edgeKey(d.source.id, d.target.id))));
    };

    function notifyGraphChange() {
        emit('graph-change', serializeGraph(nodes, links));
    }

    function linkMarkers(link) {
        if (!props.directed) {
            return {
                start: link.left ? `url(#${markerId}-start-arrow)` : '',
                end: link.right ? `url(#${markerId}-end-arrow)` : '',
            };
        }
        return {
            start: link.left ? `url(#${markerId}-start-arrow)` : '',
            end: link.right ? `url(#${markerId}-end-arrow)` : '',
        };
    }

    function tick() {
        path.attr('d', function (d) {
            const deltaX = d.target.x - d.source.x;
            const deltaY = d.target.y - d.source.y;
            const dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            const normX = deltaX / dist;
            const normY = deltaY / dist;
            const sourcePadding = d.left ? 17 : 12;
            const targetPadding = d.right ? 17 : 12;
            const sourceX = d.source.x + (sourcePadding * normX);
            const sourceY = d.source.y + (sourcePadding * normY);
            const targetX = d.target.x - (targetPadding * normX);
            const targetY = d.target.y - (targetPadding * normY);
            return 'M' + sourceX + ',' + sourceY + 'L' + targetX + ',' + targetY;
        });

        if (props.allowWeight) {
            linkLabels
                .attr('x', (d) => (d.source.x + d.target.x) / 2)
                .attr('y', (d) => (d.source.y + d.target.y) / 2 - 6);
        }

        circle.attr('transform', function (d) {
            return 'translate(' + d.x + ',' + d.y + ')';
        });
    }

    function applyLinkSelectionStyle(selection) {
        selection
            .classed('selected', (d) => d === selectedLink)
            .style('marker-start', (d) => linkMarkers(d).start)
            .style('marker-end', (d) => linkMarkers(d).end);
    }

    function createLink(source, target, direction) {
        let link = links.find((item) => item.source === source && item.target === target);

        if (link) {
            if (props.directed) {
                link[direction] = true;
            } else {
                link.left = true;
                link.right = true;
            }
        } else {
            link = {
                source,
                target,
                left: !props.directed,
                right: !props.directed,
                weight: 1,
            };
            if (props.directed) {
                link[direction] = true;
            }
            links.push(link);
        }

        return link;
    }

    function restart() {
        path = path.data(links);
        applyLinkSelectionStyle(path);

        path.enter().append('svg:path')
            .attr('class', 'link')
            .call(applyLinkSelectionStyle)
            .on('mousedown', function (d) {
                if (d3.event.ctrlKey) return;

                mousedownLink = d;
                selectedLink = mousedownLink === selectedLink ? null : mousedownLink;
                selectedNode = null;
                restart();
            });

        path.exit().remove();

        if (props.allowWeight) {
            linkLabels = linkLabels.data(links, (d) => `${d.source.id}-${d.target.id}`);

            linkLabels.enter().append('text')
                .attr('class', 'link-weight')
                .attr('text-anchor', 'middle')
                .text((d) => d.weight ?? 1);

            linkLabels.text((d) => d.weight ?? 1);
            linkLabels.exit().remove();
        }

        circle = circle.data(nodes, (d) => d.id);

        circle.selectAll('circle')
            .style('fill', (d) => (d === selectedNode ? d3.rgb(colors(d.id)).brighter().toString() : colors(d.id)))
            .classed('reflexive', (d) => d.reflexive);

        const g = circle.enter().append('svg:g');

        g.append('svg:circle')
            .attr('class', 'node')
            .attr('r', 12)
            .style('fill', (d) => (d === selectedNode ? d3.rgb(colors(d.id)).brighter().toString() : colors(d.id)))
            .style('stroke', (d) => d3.rgb(colors(d.id)).darker().toString())
            .classed('reflexive', (d) => d.reflexive)
            .on('mouseover', function (d) {
                if (!mousedownNode || d === mousedownNode) return;
                d3.select(this).attr('transform', 'scale(1.1)');
            })
            .on('mouseout', function (d) {
                if (!mousedownNode || d === mousedownNode) return;
                d3.select(this).attr('transform', '');
            })
            .on('mousedown', function (d) {
                if (d3.event.ctrlKey) return;

                mousedownNode = d;
                selectedNode = mousedownNode === selectedNode ? null : mousedownNode;
                selectedLink = null;

                dragLine
                    .style('marker-end', props.directed ? `url(#${markerId}-end-arrow)` : '')
                    .classed('hidden', false)
                    .attr('d', 'M' + mousedownNode.x + ',' + mousedownNode.y + 'L' + mousedownNode.x + ',' + mousedownNode.y);

                restart();
            })
            .on('mouseup', function (d) {
                if (!mousedownNode) return;

                dragLine
                    .classed('hidden', true)
                    .style('marker-end', '');

                mouseupNode = d;
                if (mouseupNode === mousedownNode) {
                    resetMouseVars();
                    return;
                }

                d3.select(this).attr('transform', '');

                let source;
                let target;
                let direction;
                if (mousedownNode.id < mouseupNode.id) {
                    source = mousedownNode;
                    target = mouseupNode;
                    direction = 'right';
                } else {
                    source = mouseupNode;
                    target = mousedownNode;
                    direction = 'left';
                }

                selectedLink = createLink(source, target, direction);
                selectedNode = null;
                restart();
            });

        g.append('svg:text')
            .attr('x', 0)
            .attr('y', 4)
            .attr('class', 'id')
            .text((d) => d.id);

        circle.exit().remove();

        syncSelection();
        applyHighlightsFn();
        force.start();
        notifyGraphChange();
    }

    function mousedown() {
        svg.classed('active', true);

        if (d3.event.ctrlKey || mousedownNode || mousedownLink) return;

        const point = d3.mouse(this);
        const node = { id: ++lastNodeId, reflexive: false };
        node.x = point[0];
        node.y = point[1];
        nodes.push(node);

        restart();
    }

    function mousemove() {
        if (!mousedownNode) return;

        dragLine.attr('d', 'M' + mousedownNode.x + ',' + mousedownNode.y + 'L' + d3.mouse(this)[0] + ',' + d3.mouse(this)[1]);
        restart();
    }

    function mouseup() {
        if (mousedownNode) {
            dragLine
                .classed('hidden', true)
                .style('marker-end', '');
        }

        svg.classed('active', false);
        resetMouseVars();
    }

    function spliceLinksForNode(node) {
        const toSplice = links.filter((l) => l.source === node || l.target === node);
        for (const link of toSplice) {
            links.splice(links.indexOf(link), 1);
        }
    }

    function keydown() {
        d3.event.preventDefault();

        if (lastKeyDown !== -1) return;
        lastKeyDown = d3.event.keyCode;

        if (d3.event.keyCode === 17) {
            circle.call(force.drag);
            svg.classed('ctrl', true);
        }

        if (!selectedNode && !selectedLink) return;
        switch (d3.event.keyCode) {
            case 8:
            case 46:
                if (selectedNode) {
                    nodes.splice(nodes.indexOf(selectedNode), 1);
                    spliceLinksForNode(selectedNode);
                } else if (selectedLink) {
                    links.splice(links.indexOf(selectedLink), 1);
                }
                selectedLink = null;
                selectedNode = null;
                restart();
                break;
            case 66:
                if (selectedLink && props.directed) {
                    selectedLink.left = true;
                    selectedLink.right = true;
                }
                restart();
                break;
            case 76:
                if (selectedLink && props.directed) {
                    selectedLink.left = true;
                    selectedLink.right = false;
                }
                restart();
                break;
            case 87:
                if (selectedLink && props.allowWeight) {
                    syncSelection();
                }
                break;
            case 82:
                if (selectedNode) {
                    selectedNode.reflexive = !selectedNode.reflexive;
                } else if (selectedLink && props.directed) {
                    selectedLink.left = false;
                    selectedLink.right = true;
                }
                restart();
                break;
        }
    }

    function keyup() {
        lastKeyDown = -1;

        if (d3.event.keyCode === 17) {
            circle
                .on('mousedown.drag', null)
                .on('touchstart.drag', null);
            svg.classed('ctrl', false);
        }
    }

    svg.on('mousedown', mousedown)
        .on('mousemove', mousemove)
        .on('mouseup', mouseup);
    d3.select(window)
        .on('keydown', keydown)
        .on('keyup', keyup);

    restart();

    onUnmounted(() => {
        d3.select(window)
            .on('keydown', null)
            .on('keyup', null);
    });
});
</script>

<style scoped>
.graph-editor p {
    margin: 0 0 8px;
}

.graph-hint {
    margin: 0 0 8px;
    font-size: 12px;
    color: var(--vp-c-text-2, #909399);
}

.link-toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
    margin-bottom: 8px;
    padding: 8px 12px;
    border: 1px solid var(--vp-c-divider, #dcdfe6);
    border-radius: 6px;
    background: var(--vp-c-bg-soft, #f5f7fa);
    font-size: 13px;
}

.weight-label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
}

.weight-input {
    width: 72px;
    padding: 4px 8px;
    border: 1px solid var(--vp-c-divider, #dcdfe6);
    border-radius: 4px;
}

svg {
    background-color: #FFF;
    cursor: default;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    -o-user-select: none;
    user-select: none;
}

svg:not(.active):not(.ctrl) {
    cursor: crosshair;
}

:deep(path.link) {
    fill: none;
    stroke: #000;
    stroke-width: 3px;
    cursor: default;
}

svg:not(.active):not(.ctrl) :deep(path.link) {
    cursor: pointer;
}

:deep(path.link.selected) {
    stroke-dasharray: 10, 2;
}

:deep(path.link.dragline) {
    pointer-events: none;
}

:deep(path.link.hidden) {
    stroke-width: 0;
}

:deep(circle.node) {
    stroke-width: 1.5px;
    cursor: pointer;
}

:deep(circle.node.reflexive) {
    stroke: #000 !important;
    stroke-width: 2.5px;
}

:deep(circle.node.hl-visited) {
    stroke: #67c23a !important;
    stroke-width: 4px;
}

:deep(circle.node.hl-frontier) {
    stroke: #e6a23c !important;
    stroke-width: 4px;
}

:deep(circle.node.hl-current) {
    stroke: #f56c6c !important;
    stroke-width: 5px;
}

:deep(path.link.hl-edge) {
    stroke: #67c23a;
    stroke-width: 5px;
}

:deep(text) {
    font: 12px sans-serif;
    pointer-events: none;
}

:deep(text.id) {
    text-anchor: middle;
    font-weight: bold;
}

:deep(text.link-weight) {
    fill: var(--vp-c-brand, #409eff);
    font-weight: 700;
}
</style>
