// Supervised Image Classification using Sentinel 2A Image

// RoI is the Mumbai Metropolitian Region

// Load Sentinel 2A data
/**
 * Function to mask clouds using the Sentinel-2 QA band
 * @param {ee.Image} image Sentinel-2 image
 * @return {ee.Image} cloud masked Sentinel-2 image
 */
function maskS2clouds(image) {
  var qa = image.select('QA60');

  // Bits 10 and 11 are clouds and cirrus, respectively.
  var cloudBitMask = 1 << 10;
  var cirrusBitMask = 1 << 11;

  // Both flags should be set to zero, indicating clear conditions.
  var mask = qa.bitwiseAnd(cloudBitMask).eq(0)
      .and(qa.bitwiseAnd(cirrusBitMask).eq(0));

  return image.updateMask(mask).divide(10000);
}

var dataset = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                  .filterDate('2025-01-01', '2025-05-01')
                  .filterBounds(aoi)
                  // Pre-filter to get less cloudy granules.
                  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE',20))
                  .map(maskS2clouds);

var raw_image = dataset.median();

var ndvi = raw_image.normalizedDifference(['B8', 'B4']).rename('NDVI');  // For Vegetation
var ndwi = raw_image.normalizedDifference(['B3', 'B8']).rename('NDWI');  // For Water Bodies
var ndbi = raw_image.normalizedDifference(['B11', 'B8']).rename('NDBI');  // For Urban Areas
var savi = raw_image.expression(
    '((NIR - RED) / (NIR + RED + L)) * (1 + L)', {
      'NIR': raw_image.select('B8'),
      'RED': raw_image.select('B4'),
      'L': 0.5
    }).rename('SAVI');  // For Soil

var spectralBands = raw_image.select(['B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B11', 'B12']);
var image = spectralBands.addBands([ndvi, ndwi, ndbi, savi]);

var visualization = {
  min: 0.0,
  max: 0.3,
  bands: ['B2', 'B3', 'B4']
};

Map.centerObject(aoi, 8);

Map.addLayer(image, visualization, 'Sentinel 2A Jan - May 2025 MMR');

print(trainingData);

var label = 'Class';
var bands = image.bandNames();
var input = image;

var trainImage = input.sampleRegions({
  collection: trainingData,
  properties: [label],
  scale: 10,
  tileScale: 8
});
print(trainImage);

// 80% TRAINING DATA AND 20% VALIDATION DATA
var sampledData = trainImage.randomColumn();
var trainSet = sampledData.filter(ee.Filter.lessThan('random', 0.8));
var validSet = sampledData.filter(ee.Filter.greaterThanOrEquals('random', 0.8));

var classifier = ee.Classifier.smileRandomForest({numberOfTrees: 100}).train(trainSet, label, bands);
var classified = input.classify(classifier);
print(classified);

var landCoverPalette = [
  '#093BBA', // Ocean Color (0)
  '#D2D4C3', // UrbanArea Color (1)
  '#2F8A42', // Vegetation Color (2)
  // "#573C05", // OtherLand Color (3)
  // '#4790BA', // WaterBodies Color (4)
  ];

// Run this AFTER .classify()
var classified_map = classified.focal_mode({
  radius: 1.5, // in pixels, 1.5 is a good start
  kernelType: 'square',
  units: 'pixels'
});
// Add this filtered map to the layer instead of the raw classification
// Map.addLayer(classified_map, {palette: landCoverPalette, min: 0, max: 4}, 'Classification (Cleaned)');
Map.addLayer(classified_map, {palette: landCoverPalette, min: 0, max: 2}, 'classification');

// var confusionMatrix = ee.ConfusionMatrix(validSet.classify(classifier)
// .errorMatrix({
//   actual: 'Class',
//   predicted: 'classification'
// }));

// print('Confusion Matrix: ', confusionMatrix);
// print('Overall Accuracy: ', confusionMatrix.accuracy());
// print('Producers Accuracy: ', confusionMatrix.producersAccuracy());
// print('Consumers Accuracy: ', confusionMatrix.consumersAccuracy());

// Export.image.toDrive({
//   image: classified,
//   description: 'SENTINEL-RF100-UVW',
//   scale: 10,
//   region: aoi,
//   maxPixels: 1e13
// });

// Assuming your classified image is called 'classifiedImage'
// and has 4 classes with values 1, 2, 3, 4

// Define your study area (replace with your actual geometry)
var studyArea = aoi; // or define your own geometry

// Method 1: Calculate area for each class using reduceRegion
var areaImage = ee.Image.pixelArea().divide(1000000); // Convert to sq km

// Create a function to calculate area for each class
var calculateClassArea = function(classValue) {
  var classMask = classified.eq(classValue);
  var area = areaImage.updateMask(classMask)
    .reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: studyArea,
      scale: 30, // Adjust scale according to your image resolution
      maxPixels: 1e9
    });
  return area.get('area');
};

// Calculate area for each class (assuming classes are 1, 2, 3, 4)
var class0Area = calculateClassArea(0);
var class1Area = calculateClassArea(1);
var class2Area = calculateClassArea(2);
// var class3Area = calculateClassArea(3);
// var class4Area = calculateClassArea(4);

// Print results
print('Class 0 Area (sq km):', class0Area);
print('Class 1 Area (sq km):', class1Area);
print('Class 2 Area (sq km):', class2Area);
// print('Class 3 Area (sq km):', class3Area);
// print('Class 4 Area (sq km):', class4Area);

// Method 2: Calculate all class areas at once using grouped reducer
var areasByClass = areaImage.addBands(classified.rename('class'))
  .reduceRegion({
    reducer: ee.Reducer.sum().group({
      groupField: 1,  // group by class band
      groupName: 'class'
    }),
    geometry: studyArea,
    scale: 30, // Adjust according to your image resolution
    maxPixels: 1e9
  });

print('All class areas:', areasByClass);

// Method 3: Create a more detailed breakdown with class names
var classNames = ee.Dictionary({
  0: 'Ocean',
  1: 'UrbanAreas',
  2: 'Vegetation',
  // 3: 'OtherLand',
  // 4: 'WaterBodies'
});

// Function to get area with class names
var getAreaWithNames = function() {
  var areas = ee.List(areasByClass.get('groups'));
  var result = areas.map(function(item) {
    var dict = ee.Dictionary(item);
    var classValue = dict.get('class');
    var area = dict.get('sum');
    var className = classNames.get(classValue);
    return ee.Dictionary({
      'class': classValue,
      'class_name': className,
      'area_sq_km': area
    });
  });
  return result;
};

var detailedResults = getAreaWithNames();
print('Detailed results with class names:', detailedResults);

// Method 4: Export results to CSV
var exportTable = ee.FeatureCollection(
  ee.List(areasByClass.get('groups')).map(function(item) {
    var dict = ee.Dictionary(item);
    var classValue = dict.get('class');
    var area = dict.get('sum');
    var className = classNames.get(classValue);
    
    return ee.Feature(null, {
      'class': classValue,
      'class_name': className,
      'area_sq_km': area
    });
  })
);

// Export to Google Drive
Export.table.toDrive({
  collection: exportTable,
  description: 'classification_areas',
  fileFormat: 'CSV'
});

// Alternative: Calculate total area for verification
var totalArea = areaImage.reduceRegion({
  reducer: ee.Reducer.sum(),
  geometry: studyArea,
  scale: 30,
  maxPixels: 1e9
});
print('Total study area (sq km):', totalArea);
