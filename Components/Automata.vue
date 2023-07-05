<script setup>
import { ref } from 'vue'
import * as graphviz from 'd3-graphviz'
const count = ref(0);

function loadScript(src, callback) {
    var script = document.createElement('script'),
        head = document.getElementsByTagName('head')[0];
    script.type = 'text/javascript';
    script.src = src;
    if (script.addEventListener) {
        script.addEventListener('load', function () {
          if (callback) callback();
        }, false);
    } else if (script.attachEvent) {
        script.attachEvent('onreadystatechange', function () {
            var target = window.event.srcElement;
            if (target.readyState == 'loaded') {
              if (callback) callback();
            }
        });
    }
    head.appendChild(script);
}

loadScript('https://unpkg.com/@hpcc-js/wasm/dist/graphviz.umd.js', function () {
  graphviz.graphviz('#graph').renderDot('digraph {a -> b}');
});

</script>

<template>
  <p>Automata</p>
  <div id="graph"></div>
  <button @click="count++">You clicked me {{ count }} times.</button>
</template>