//边缘宽度
var margin = {top: 30, right: 120, bottom: 0, left: 120},
    width = 960 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;
//x轴刻度设置，并确定值域
var x = d3.scale.linear()
    .range([0, width]);
//柱状条高度
var barHeight = 20;
//元素有无儿子时的颜色区分
var color = d3.scale.ordinal()
    .range(["steelblue", "#ccc"]);
//变化持续时间与变化延迟时间
var duration = 750,
    delay = 25;

//元素的祖先中根节点的儿子的名字(key值)	
var fn;	

//建立分层布局，并设置规则
var partition = d3.layout.partition()
	
	//该函数确定了每一个元素寻找其所应使用的值的方法
    .value(function(d) {
		//由于json中每一个元素的值被分为了不同的种类，如下所示，值共有为了4个不同的种类。
		
		/*"values": [
				{"x": "\u9152\u4e1a", "y": 368690.6201477051}, 
				{"x": "\u96f6\u552e", "y": 658062.6151428223}, 
				{"x": "\u7cd6\u4e1a", "y": 374443.4231185913}, 
				{"x": "\u5176\u4ed6", "y": 340343.4537963867}]}*/
				
		//而每一个元素在不同的分类下，所使用的值是不同的，因此，需要通过该函数确定其所应使用的值的类型。
		
		//该函数用于寻找每一个元素的根节点的后一代，即该元素所在的分类
		function findFather(d){							
							//如果该元素就是根节点，返回
							if(d.key == "all"){								
								return;
							}
							//如果元素的父亲就是根节点，说明找到了根节点的儿子(元素所在的分类)，返回该根节点的儿子的名称
							if(d.parent.key == "all"){
								fn = d.key;								
								return;
							//如果不是，递归使用该函数，查找该元素的爷爷是否是根节点
							}else{
								findFather(d.parent);
							}
							//得到结果后，返回元素的根节点的儿子(元素所在的分类)的名称							
							return fn;							
						}
						//调用上述的函数，并获得该元素根节点儿子(元素所在的分类)的名称
						var finalName  = findFather(d);
						
						//根据该元素的祖先中根节点的儿子(元素所在的分类)的名称，调用该元素所应该使用的值
						if(finalName == "\u9152\u4e1a"){							
							return d.values[0].y;							
						}else if(finalName == "\u96f6\u552e"){							
							return d.values[1].y; 							
						}else if(finalName == "\u7cd6\u4e1a"){						
							return d.values[2].y;
						}else{
							return d.values[3].y;
						}
	});
	
//建立x轴，确定刻度的方向
var xAxis = d3.svg.axis()
    .scale(x)
    .orient("top");
	
//建立画布
var svg = d3.select("body").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
	
//绘制一个长方形以作为背景板，点击背景板可以返回上一级
svg.append("rect")
    .attr("class", "background")
    .attr("width", width)
    .attr("height", height)
    .on("click", up);
	
//在画布中添加x轴
svg.append("g")
    .attr("class", "x axis");
	
//在画布中绘制y轴
svg.append("g")
    .attr("class", "y axis")
  .append("line")
    .attr("y1", "100%");

//json文件读取，将读取的json文件中的数据转换为分层结构，并且调用函数
d3.json("spain.json", function(error, root) {
  if (error) throw error;
  
  partition.nodes(root);
  
  x.domain([0, root.value]).nice();
  down(root, 0);
});


function down(d, i) {
  if (!d.children || this.__transition__) return;	
  var end = duration + d.children.length * delay;

  // Mark any currently-displayed bars as exiting.
  var exit = svg.selectAll(".enter")
      .attr("class", "exit");

  // Entering nodes immediately obscure the clicked-on bar, so hide it.
  exit.selectAll("rect").filter(function(p) { return p === d; })
      .style("fill-opacity", 1e-6);

  // Enter the new bars for the clicked-on data.
  // Per above, entering bars are immediately visible.
  var enter = bar(d)
      .attr("transform", stack(i))
      .style("opacity", 1);

  // Have the text fade-in, even though the bars are visible.
  // Color the bars as parents; they will fade to children if appropriate.
  enter.select("text").style("fill-opacity", 1e-6);
  enter.select("rect").style("fill", color(true));

  // Update the x-scale domain.
  x.domain([0, d3.max(d.children, function(d) { return d.value; })]).nice();

  // Update the x-axis.
  svg.selectAll(".x.axis").transition()
      .duration(duration)
      .call(xAxis);

  // Transition entering bars to their new position.
  var enterTransition = enter.transition()
      .duration(duration)
      .delay(function(d, i) { return i * delay; })
      .attr("transform", function(d, i) { return "translate(0," + barHeight * i * 1.2 + ")"; });

  // Transition entering text.
  enterTransition.select("text")
      .style("fill-opacity", 1);

  // Transition entering rects to the new x-scale.
  enterTransition.select("rect")
      .attr("width", function(d) { return x(d.value); })
      .style("fill", function(d) { return color(!!d.children); });

  // Transition exiting bars to fade out.
  var exitTransition = exit.transition()
      .duration(duration)
      .style("opacity", 1e-6)
      .remove();

  // Transition exiting bars to the new x-scale.
  exitTransition.selectAll("rect")
      .attr("width", function(d) { return x(d.value); });

  // Rebind the current node to the background.
  svg.select(".background")
      .datum(d)
    .transition()
      .duration(end);

  d.index = i;
}

function up(d) {
  if (!d.parent || this.__transition__) return;
  var end = duration + d.children.length * delay;

  // Mark any currently-displayed bars as exiting.
  var exit = svg.selectAll(".enter")
      .attr("class", "exit");

  // Enter the new bars for the clicked-on data's parent.
  var enter = bar(d.parent)
      .attr("transform", function(d, i) { return "translate(0," + barHeight * i * 1.2 + ")"; })
      .style("opacity", 1e-6);

  // Color the bars as appropriate.
  // Exiting nodes will obscure the parent bar, so hide it.
  enter.select("rect")
      .style("fill", function(d) { return color(!!d.children); })
    .filter(function(p) { return p === d; })
      .style("fill-opacity", 1e-6);

  // Update the x-scale domain.
  x.domain([0, d3.max(d.parent.children, function(d) { return d.value; })]).nice();

  // Update the x-axis.
  svg.selectAll(".x.axis").transition()
      .duration(duration)
      .call(xAxis);

  // Transition entering bars to fade in over the full duration.
  var enterTransition = enter.transition()
      .duration(end)
      .style("opacity", 1);

  // Transition entering rects to the new x-scale.
  // When the entering parent rect is done, make it visible!
  enterTransition.select("rect")
      .attr("width", function(d) { return x(d.value); })
      .each("end", function(p) { if (p === d) d3.select(this).style("fill-opacity", null); });

  // Transition exiting bars to the parent's position.
  var exitTransition = exit.selectAll("g").transition()
      .duration(duration)
      .delay(function(d, i) { return i * delay; })
      .attr("transform", stack(d.index));

  // Transition exiting text to fade out.
  exitTransition.select("text")
      .style("fill-opacity", 1e-6);

  // Transition exiting rects to the new scale and fade to parent color.
  exitTransition.select("rect")
      .attr("width", function(d) { return x(d.value); })
      .style("fill", color(true));

  // Remove exiting nodes when the last child has finished transitioning.
  exit.transition()
      .duration(end)
      .remove();

  // Rebind the current parent to the background.
  svg.select(".background")
      .datum(d.parent)
    .transition()
      .duration(end);
}

// Creates a set of bars for the given data node, at the specified index.
function bar(d) {
  var bar = svg.insert("g", ".y.axis")
      .attr("class", "enter")
      .attr("transform", "translate(0,5)")
    .selectAll("g")
      .data(d.children)
    .enter().append("g")
      .style("cursor", function(d) { return !d.children ? null : "pointer"; })
      .on("click", down);

  bar.append("text")
      .attr("x", -6)
      .attr("y", barHeight / 2)
      .attr("dy", ".35em")
      .style("text-anchor", "end")
      .text(function(d) { return d.key||d.x; });

  bar.append("rect")
      .attr("width", function(d) { return x(d.value); })
      .attr("height", barHeight);

  return bar;
}

// A stateful closure for stacking bars horizontally.
function stack(i) {
  var x0 = 0;
  return function(d) {
    var tx = "translate(" + x0 + "," + barHeight * i * 1.2 + ")";
    x0 += x(d.value);
    return tx;
  };
}

