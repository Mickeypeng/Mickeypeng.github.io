function drawMultiLineText(paper, x, y, text, color) {
    let multilineText = paper.text({text: text.split('\n')})
        .attr({fill: color, fontSize: "18px"});
    multilineText.selectAll("tspan")
        .forEach(
            function (tspan, i) {
                tspan.attr({
                    x: x, y: y + 25 * (i + 1)
                });
            }
        );
    let bbox = multilineText.getBBox();
    let bgColor = tinycolor.mostReadable(color, ['#000', '#fff']);
    bgColor = bgColor == null ? '#000' : bgColor.toHexString();
    let box = paper.rect(bbox.x, bbox.y, bbox.width, bbox.height, 2, 2)
        .attr({
            'opacity': 0.6,
            'fill': bgColor,
            'stroke': color,
            'strokeWidth': 2
        });
    return paper.g(box, multilineText);
}

function drawArrow(paper, start_x, start_y, end_x, end_y, color, text) {
    let textBox;
    let arrow = paper.polygon([0, 10, 4, 10, 2, 0, 0, 10]).attr({
        fill: color
    }).transform('r90');
    let marker = arrow.marker(0, 0, 10, 10, 6, 5);
    let arrowLine = paper.line(start_x, start_y, end_x, end_y)
        .attr({
            stroke: color,
            strokeWidth: '2px',
            markerEnd: marker
        })
        .hover(
            function () {
                zpdPaper = Snap.select('#snapsvg-zpd-' + paper.paper.id);
                textBox = drawMultiLineText(zpdPaper, this.getBBox().cx, this.getBBox().cy, text, color);
                this.attr({strokeWidth: '4px'})
            },
            function hoverOut() {
                textBox.remove();
                this.attr({strokeWidth: '2px'})
            }
        );
    arrowLine.zoom = function (ratio, offset) {
        this.attr({
            'x1': start_x * ratio + offset,
            'x2': end_x * ratio + offset
        })
    };
    return arrowLine;
}

function drawHLine(paper, start_x, start_y, length, color) {
    let hline = paper.line(start_x, start_y, start_x + length, start_y)
        .attr({
            stroke: color,
            strokeWidth: '2px'
        });
    hline.zoom = function (ratio, offset) {
        this.attr({
            'x1': start_x * ratio + offset,
            'x2': (start_x + length) * ratio + offset
        })
    };
    return hline;
}

function drawRects(paper, midline_x, midline_y, width, height, color, text) {
    let textBox;
    let rect = paper.rect(midline_x - width / 2, midline_y - height / 2, width, height, 2, 2)
        .attr({
            'opacity': 0.6,
            'fill': color
        })
        .hover(
            function () {
                zpdPaper = Snap.select('#snapsvg-zpd-' + paper.paper.id);
                textBox = drawMultiLineText(zpdPaper, this.getBBox().cx, this.getBBox().cy, text, color);
            },
            function hoverOut() {
                textBox.remove();
            }
        );
    rect.zoom = function (ratio, offset) {
        this.attr({
            'x': midline_x * ratio + offset,
            'width': width * ratio
        })
    };
    return rect;
}

function drawLegend(paper, x, y, legends) {
    let maxNumOfRows = 5;
    y = y - 25 * (maxNumOfRows + 1);
    let colorLineLength = 30;
    let legendBox = paper.g();
    legends.forEach(
        function (legend, i) {
            if (i != 0 && i % maxNumOfRows == 0) {
                x = legendBox.getBBox().x2;
            }
            i = i % maxNumOfRows;
            legendBox.add(
                paper.line(x + 2, y + 25 * i + 19, x + 2 + colorLineLength, y + 25 * i + 19)
                    .attr({
                        stroke: legend.color,
                        strokeWidth: '5px'
                    }),
                paper.text(x + 2 + colorLineLength + 5, y + 25 * (i + 1), legend.text)
                    .attr({fill: "#000", fontSize: "18px"})
            );
        });
    let bbox = legendBox.getBBox();
    let box = paper.rect(bbox.x - 2, bbox.y, bbox.width + 3, bbox.height, 2, 2)
        .attr({
            'fill': "#fff",
            'stroke': "#000",
            'strokeWidth': 2
        });
    box.after(legendBox);
}

function getTextHeight(paper, attr) {
    let tmpText = paper.text(0, 0, '0').attr(attr);
    let height = tmpText.getBBox().height;
    tmpText.remove();
    return height;
}

function formatFloat(num, maxFractionDigits) {
    let m = Math.pow(10, maxFractionDigits);
    return num.toFixed(maxFractionDigits) * m / m;
}

function initTimeline(paper, y) {
    let minInterval = 50;
    let maxNumOfInterval = 100;

    let hline = paper.line(0, y, 0, y)
        .attr({
            strokeWidth: '3px',
            stroke: '#000'
        });
    let vlines = [];
    let texts = [];
    for (let i = 0; i < maxNumOfInterval; i++) {
        vlines.push(paper.line(0, y, 0, y - 10)
            .attr({
                strokeWidth: '3px',
                stroke: '#000',
                visibility: "hidden"
            }));
        texts.push(paper.text(0, 0, '').attr({"text-anchor": "middle", visibility: "hidden"}));
    }
    let timeline = paper.g();
    timeline.add(hline);
    for (let i = 0; i < maxNumOfInterval; i++) {
        timeline.add(vlines[i], texts[i]);
    }

    let textHeight = getTextHeight(paper, texts[0].attr());
    let lastUsedNum = 0;
    timeline.update = function (start_time, end_time, start_x, end_x) {
        let lengthOfUnitTime = (end_x - start_x) / (end_time - start_time);
        let timeInterval = Math.pow(10, Math.ceil(Math.log10(minInterval / lengthOfUnitTime)));
        let maxFractionDigits = -Math.log10(timeInterval);
        if (timeInterval * lengthOfUnitTime / minInterval >= 2) {
            timeInterval /= 2;
            maxFractionDigits += 1;
        }
        maxFractionDigits = Math.max(0, maxFractionDigits);
        hline.attr({x1: start_x, x2: end_x});
        let time = Math.ceil(start_time / timeInterval) * timeInterval;
        let i = 0;
        for (; time <= end_time && i < maxNumOfInterval; time += timeInterval, i++) {
            let x = start_x + (time - start_time) * lengthOfUnitTime;
            vlines[i].attr({x1: x, x2: x, visibility: ""});
            texts[i].attr({
                x: x, y: y + textHeight + 5,
                text: formatFloat(time, maxFractionDigits),
                visibility: ""
            });
        }
        for (let j = i; j < lastUsedNum; j++) {
            vlines[j].attr({visibility: "hidden"});
            texts[j].attr({visibility: "hidden"});
        }
        lastUsedNum = i;
    };

    return timeline;
}

function computeTimelineParameters(start_time, end_time, start_x, end_x,
                                   ratio, offset, window_x, window_width) {
    let zpd_start_x = start_x * ratio + offset;
    let zpd_end_x = end_x * ratio + offset;
    window_x = Math.max(zpd_start_x, window_x);
    window_width = Math.min(window_width, zpd_end_x - window_x);
    let timeOfUnitLength = (end_time - start_time) / (zpd_end_x - zpd_start_x);
    let window_start_time = start_time + (window_x - zpd_start_x) * timeOfUnitLength;
    let window_end_time = window_start_time + window_width * timeOfUnitLength;
    return [window_start_time, window_end_time, window_x, window_x + window_width];
}

function initTimelineIndicator(paper, x_range_min, x_range_max, y_min, y_max) {
    let dashLine = paper.line(0, y_min, 0, y_max)
        .attr({
            strokeWidth: '1px',
            stroke: 'grey',
            strokeDasharray: '3',
            visibility: "hidden"
        });
    let indicator = paper.g();
    indicator.add(dashLine);
    indicator.update = function (new_x, ratio, offset) {
        if (new_x >= x_range_min * ratio + offset
            && new_x <= x_range_max * ratio + offset) {
            dashLine.attr({x1: new_x, x2: new_x, visibility: ""});
        } else {
            dashLine.attr({visibility: "hidden"});
        }
    };
    return indicator;
}

function draw(data) {
    let snap = Snap(2000, 2000);

    drawLegend(snap, 0, 200, data.Legend);

    let elements = new Array();
    for (const hline of data.HLine) {
        elements.push(drawHLine(snap, hline[0], hline[1], hline[2], hline[3]));
    }

    for (const rect of data.Rect) {
        elements.push(drawRects(snap, rect[0], rect[1], rect[2], rect[3], rect[4], rect[5]));
    }

    for (const arrow of data.Arrow) {
        elements.push(drawArrow(snap, arrow[0], arrow[1], arrow[2], arrow[3], arrow[4], arrow[5]));
    }

    let timeline_y = data.timeline.y;
    let timeline = initTimeline(snap, timeline_y);
    let timeline_start_time = data.timeline.start_time;
    let timeline_end_time = data.timeline.end_time;
    let timeline_start_x = data.timeline.start_x;
    let timeline_end_x = data.timeline.end_x;
    timeline.update(timeline_start_time, timeline_end_time, timeline_start_x, timeline_end_x);

    let timelineIndicator = initTimelineIndicator(snap, timeline_start_x, timeline_end_x, 0, timeline_y);

    snap.paper.zpd({
        zoom: false
    });

    let zoomRate = 0.2;
    let ratio = 1;
    let offset = 0;
    let mouse_x = 0;
    snap.paper.mousemove(
        function (ev, x, y) {
            mouse_x = x;
            timelineIndicator.update(x - snap.paper.zpd('save').e, ratio, offset);
        }
    );

    snap.node.addEventListener(
        "mousewheel",
        function (ev) {
            ev.preventDefault();
            let relative_mouse_x = mouse_x - snap.paper.zpd('save').e;
            let mouse_x_of_original_paper = (relative_mouse_x - offset) / ratio;
            ratio = ratio * (1 - ev.deltaY / 100 * zoomRate);
            offset = -(mouse_x_of_original_paper * ratio - relative_mouse_x);
            for (const element of elements) {
                element.zoom(ratio, offset);
            }
            let args = computeTimelineParameters(
                timeline_start_time, timeline_end_time, timeline_start_x, timeline_end_x,
                ratio, offset, -snap.paper.zpd('save').e - 1000, 4000);
            timeline.update(args[0], args[1], args[2], args[3]);
        }, false
    );
}

function test() {
    let data = JSON.parse(
        '{ "HLine":[[50,50,500,"#000"],[50,150,500,"#000"],[50,250,500,"#000"]],' +
        '"Arrow":[[100, 50, 120, 150, "#000", "123456"], [110, 50, 250, 250, "#888", "222"]], '
        + '"Rect":[[90, 50, 100, 10, "#1F1", "rect"]]}'
    );
    draw(data);
}
