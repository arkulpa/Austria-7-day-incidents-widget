// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: brown; icon-glyph: magic;
// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.

// constants
const colorDistrict = new Color('67BD6A', 1);
const colorState = new Color('FE9305', 1);
const colorCountry = new Color('888888', 1);
const textColor = colorCountry;
const numberOfPastDays = 16 * 7;

const params = args.widgetParameter;
let district = 803;
let state = 8;

if (params && params.split(';').length === 2) {
  const paramsArray = params.split(';');
  district = paramsArray[0];
  state = paramsArray[1];
}

const apiUrl = 'https://covid19-dashboard.ages.at/data/CovidFaelle_Timeline_GKZ.csv';
const apiUrlTimeline = 'https://covid19-dashboard.ages.at/data/CovidFaelle_Timeline.csv';

const isSmallWidget = config.widgetFamily == 'small';
const leftPadding = 140;
const rightPadding = isSmallWidget ? 90 : 80;
const fontSize = isSmallWidget ? 8 : 12;
const topPadding = isSmallWidget ? 40 : 30;
const bottomPadding = 60;

const widthHeight = 800;
const apiData = await new Request(apiUrl).loadString();
const apiDataTimeline = await new Request(apiUrlTimeline).loadString();
const apiDataLines = apiData.split('\n');
const apiDataTimelineLines = apiDataTimeline.split('\n');
const chartRectangle = new Rect(
  leftPadding,
  topPadding,
  widthHeight - leftPadding - rightPadding,
  widthHeight - topPadding - bottomPadding
);

function parseDate(tsStr) {
  const dateStr = tsStr.slice(0, 10);
  const dateParts = dateStr.split('.');
  const d = new Date();
  d.setFullYear(parseInt(dateParts[2], 10), parseInt(dateParts[1], 10) - 1, parseInt(dateParts[0], 10));
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

class CovidEntry {
  constructor(
    timestamp,
    name,
    id,
    population,
    cases,
    casesSum,
    cases7Days,
    incidence7Days,
    dailyDeaths,
    deathsSum,
    dailyHealed,
    healedSum
  ) {
    this.timestamp = timestamp.substr(0, 6);
    this.date = parseDate(timestamp);
    this.name = name;
    this.id = parseInt(id);
    this.population = parseInt(population);
    this.cases = parseInt(cases);
    this.casesSum = parseInt(casesSum);
    this.cases7Days = parseInt(cases7Days);
    this.incidence7Days = parseFloat(incidence7Days.replace(',', '.'));
    this.dailyDeaths = parseInt(dailyDeaths);
    this.deathsSum = parseInt(deathsSum);
    this.dailyHealed = parseInt(dailyHealed);
    this.healedSum = parseInt(healedSum);
  }
}

function parseCsv(data) {
  const entries = [];
  while (data.length) {
    const line = data.shift();
    const splitted = line.split(';');
    entries.push(
      new CovidEntry(
        splitted[0],
        splitted[1],
        splitted[2],
        splitted[3],
        splitted[4],
        splitted[5],
        splitted[6],
        splitted[7],
        splitted[8],
        splitted[9],
        splitted[10],
        splitted[10]
      )
    );
  }
  return entries;
}
const districtEntries = parseCsv(apiDataLines)
  .filter((entry) => entry.id == district)
  .reverse()
  .slice(0, numberOfPastDays)
  .reverse();
const allStateEntries = parseCsv(apiDataTimelineLines);
const stateEntries = allStateEntries
  .filter((entry) => entry.id == state)
  .reverse()
  .slice(0, numberOfPastDays)
  .reverse();
const austriaEntries = allStateEntries
  .filter((entry) => entry.id == 10)
  .reverse()
  .slice(0, numberOfPastDays)
  .reverse();
const numbers = districtEntries.map((entry) => entry.incidence7Days);
const numbers2 = stateEntries.map((entry) => entry.incidence7Days);
const numbers3 = austriaEntries.map((entry) => entry.incidence7Days);
const allValues = numbers.concat(numbers2).concat(numbers3);
class LineChart {
  // LineChart by https://kevinkub.de/
  constructor(width, height, seriesA, seriesB, seriesC) {
    this.ctx = new DrawContext();
    this.ctx.size = new Size(width, height);
    this.seriesA = seriesA;
    this.seriesB = seriesB;
    this.seriesC = seriesC;
  }

  _calculatePath(series, fillPath) {
    let maxValue = Math.max(...allValues);
    maxValue = Math.ceil(Math.max(...allValues) / 100) * 100;
    const minValue = 0; // Math.min(...series);
    const difference = maxValue - minValue;
    const count = series.length;
    const step = chartRectangle.width / (count - 1);
    const points = series.map((current, index, all) => {
      const x = step * index + leftPadding;
      const y = chartRectangle.height - ((current - minValue) / difference) * chartRectangle.height + topPadding;
      return new Point(x, y);
    });
    return this._getSmoothPath(points, fillPath);
  }

  _getSmoothPath(points, fillPath) {
    const path = new Path();
    path.move(new Point(leftPadding, points[0].y));
    path.addLine(points[0]);
    for (let i = 0; i < points.length - 1; i++) {
      const xAvg = (points[i].x + points[i + 1].x) / 2;
      const yAvg = (points[i].y + points[i + 1].y) / 2;
      const avg = new Point(xAvg, yAvg);
      const cp1 = new Point((xAvg + points[i].x) / 2, points[i].y);
      const next = new Point(points[i + 1].x, points[i + 1].y);
      const cp2 = new Point((xAvg + points[i + 1].x) / 2, points[i + 1].y);
      path.addQuadCurve(avg, cp1);
      path.addQuadCurve(next, cp2);
    }
    if (fillPath) {
      path.addLine(new Point(this.ctx.size.width, this.ctx.size.height));
      path.closeSubpath();
    }
    return path;
  }

  configure(fn) {
    const pathA = this._calculatePath(this.seriesA, false);
    const pathB = this._calculatePath(this.seriesB, false);
    const pathC = this._calculatePath(this.seriesC, false);
    if (fn) {
      fn(this.ctx, pathA, pathB, pathC);
    } else {
      this.ctx.addPath(pathA);
      this.ctx.fillPath(pathA);
      this.ctx.addPath(pathB);
      this.ctx.fillPath(pathB);
      this.ctx.addPath(pathC);
      this.ctx.fillPath(pathC);
    }
    return this.ctx;
  }
}
async function createWidget(items) {
  const list = new ListWidget();
  if (isSmallWidget) {
    list.setPadding(3, 30, 10, 20);
  } else {
    list.setPadding(6, 60, 10, 10);
  }

  const chart = new LineChart(widthHeight, widthHeight, numbers, numbers2, numbers3).configure(
    (ctx, pathA, pathB, pathC) => {
      ctx.opaque = false;
      // settings for x- and y-axis
      ctx.setTextColor(textColor);

      ctx.setFont(Font.lightSystemFont(34));
      // x axis
      ctx.setTextAlignedCenter();
      const daysPerLabel = numberOfPastDays / 4;
      const numberOfWeeks = Math.floor(numberOfPastDays / daysPerLabel);
      const widthPerWeek = chartRectangle.width / numberOfWeeks;
      for (i = 0; i < numberOfWeeks; i++) {
        const timeString = stateEntries[stateEntries.length - i * daysPerLabel - 1].timestamp;
        ctx.drawTextInRect(
          timeString,
          new Rect(chartRectangle.maxX - widthPerWeek * i - widthPerWeek / 2, chartRectangle.maxY + 5, widthPerWeek, 40)
        );
      }
      // y axis
      ctx.setTextAlignedRight();
      const topValue = Math.ceil(Math.max(...allValues) / 100) * 100;
      let currentTopValue = topValue;
      const heightPerEntry = chartRectangle.height / (topValue / 100);
      const textHeight = 34;
      while (currentTopValue >= 0) {
        const currentValue = topValue - currentTopValue;
        // counting from top-100 backwards to 0 (e.g. 500, 400, ... 0)
        ctx.drawTextInRect(
          `${currentTopValue}`,
          new Rect(
            leftPadding - 80 - 20,
            topPadding + (currentValue / 100) * heightPerEntry - textHeight / 2,
            80,
            textHeight
          )
        );
        currentTopValue -= 100;
      }
      // lockdown soft
      const indexOfLockDownSoft = austriaEntries.findIndex((entry) => entry.timestamp == '03.11.');

      ctx.setStrokeColor(new Color('F00', 0.3));
      ctx.setLineWidth(3);
      const lockdownSoftPath = new Path();
      const lockdownSoftX = (chartRectangle.width / austriaEntries.length) * indexOfLockDownSoft + leftPadding;
      lockdownSoftPath.move(new Point(lockdownSoftX, chartRectangle.minY));
      lockdownSoftPath.addLine(new Point(lockdownSoftX, chartRectangle.maxY));
      ctx.addPath(lockdownSoftPath);
      ctx.strokePath();
      
      // lockdown hard
      const indexOfLockDownHard = austriaEntries.findIndex((entry) => entry.timestamp == '17.11.');
      if (indexOfLockDownHard >= 0) {
        ctx.setStrokeColor(new Color('F00', 1));
        ctx.setLineWidth(5);
        const lockdownHardPath = new Path();
        const lockdownHardX = (chartRectangle.width / austriaEntries.length) * indexOfLockDownHard + leftPadding;
        lockdownHardPath.move(new Point(lockdownHardX, chartRectangle.minY));
        lockdownHardPath.addLine(new Point(lockdownHardX, chartRectangle.maxY));
        ctx.addPath(lockdownHardPath);
        ctx.strokePath();
      }
            
      // end of lockdown 2.0
      const indexOfLockDown20End = austriaEntries.findIndex((entry) => entry.timestamp == '07.12.');
      if (indexOfLockDown20End >= 0) {
        ctx.setStrokeColor(new Color('67BD6A', 0.3));
        ctx.setLineWidth(3);
        const lockdown20EndPath = new Path();
        const lockdown20EndX = (chartRectangle.width / austriaEntries.length) * indexOfLockDown20End + leftPadding;
        lockdown20EndPath.move(new Point(lockdown20EndX, chartRectangle.minY));
        lockdown20EndPath.addLine(new Point(lockdown20EndX, chartRectangle.maxY));
        ctx.addPath(lockdown20EndPath);
        ctx.strokePath();
      }
      
      // lockdown 3
      const indexOfLockDown3 = austriaEntries.findIndex((entry) => entry.timestamp == '26.12.');
      if (indexOfLockDown3 >= 0) {
        ctx.setStrokeColor(new Color('F00', 1));
        ctx.setLineWidth(5);
        const lockdown3Path = new Path();
        const lockdown3X = (chartRectangle.width / austriaEntries.length) * indexOfLockDown3 + leftPadding;
        lockdown3Path.move(new Point(lockdown3X, chartRectangle.minY));
        lockdown3Path.addLine(new Point(lockdown3X, chartRectangle.maxY));
        ctx.addPath(lockdown3Path);
        ctx.strokePath();
      }

      // lines
      ctx.setFont(Font.systemFont(40));
      ctx.addPath(pathA);
      ctx.setStrokeColor(colorDistrict);
      ctx.setLineWidth(5);
      ctx.strokePath();
      ctx.addPath(pathB);
      ctx.setStrokeColor(colorState);
      ctx.strokePath();
      ctx.addPath(pathC);
      ctx.setStrokeColor(colorCountry);
      ctx.strokePath();
      ctx.setFillColor(new Color('FFFF00', 0));
      ctx.fillRect(chartRectangle);
    }
  );
  list.backgroundImage = chart.getImage();
  const stack = list.addStack();
  stack.useDefaultPadding();
  stack.layoutVertically();
  const stack1 = stack.addStack();
  const text = stack1.addText(districtEntries[0].name);
  text.textColor = colorDistrict;
  text.font = Font.systemFont(fontSize);
  stack1.addSpacer();
  const textState = stack.addText(stateEntries[0].name);
  textState.textColor = colorState;
  textState.font = text.font;
  const textCountry = stack.addText('Österreich');
  textCountry.textColor = colorCountry;
  textCountry.font = text.font;
  list.addSpacer();
  return list;
}

const widget = await createWidget();
if (!config.runsInWidget) {
  await widget.presentSmall();
}

Script.setWidget(widget);
Script.complete();