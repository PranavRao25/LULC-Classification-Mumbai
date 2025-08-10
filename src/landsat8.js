// DATA SET FROM LANDSET 8 MUMBAI REGION FROM 1 JAN TO 1 MAY 2025
var dataset = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
    .filterDate('2024-01-01', '2024-05-01')
    .filterBounds(roi);

// Applies scaling factors.
function applyScaleFactors(image) {
  var opticalBands = image.select('SR_B.').multiply(0.0000275).add(-0.2);
  var thermalBands = image.select('ST_B.*').multiply(0.00341802).add(149.0);
  return image.addBands(opticalBands, null, true)
              .addBands(thermalBands, null, true);
}
dataset = dataset.map(applyScaleFactors);
var image = dataset.first();

var ndvi = image.normalizedDifference(['SR_B5', 'SR_B4']).rename('NDVI');
var ndwi = image.normalizedDifference(['SR_B3', 'SR_B5']).rename('NDWI');
var ndbi = image.normalizedDifference(['SR_B6', 'SR_B5']).rename('NDBI');
var savi = image.expression(
    '((NIR - RED) / (NIR + RED + L)) * (1 + L)', {
      'NIR': image.select('SR_B5'),
      'RED': image.select('SR_B4'),
      'L': 0.5
    }).rename('SAVI');
var spectralBands = image.select(['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7']);
var image = spectralBands.addBands([ndvi, ndwi, ndbi, savi]);

print('Final Composite Image Bands:', image.bandNames());

var visualization = {
  bands: ['SR_B4', 'SR_B3', 'SR_B2'],
  min: 0.0,
  max: 0.3,
};

Map.centerObject(roi, 8);

Map.addLayer(image, visualization, 'True Color LANDSAT 8 Jan - May 2025 MMR');

// Supervised Classification
var label = 'Class';
var bands = image.bandNames();
var input = image;

var Water = Ocean.merge(WaterBodies);
var Land = UrbanArea.merge(OtherLand);
// MANUAL COLLECTION OF DATA
var training = Ocean.merge(WaterBodies).merge(UrbanArea).merge(OtherLand).merge(Vegetation);
print(training);

// var assetId = 'users/pranavrao2500/mumbai_lulc_training_data_improved'; // Choose a unique name and path.

// Export.table.toAsset({
//   collection: training,
//   description: 'Export_Mumbai_Training_Data', // Name that appears in the Tasks tab.
//   assetId: assetId
// });

var trainImage = input.sampleRegions({
  collection: training,
  properties: [label],
  scale: 30,
  tileScale: 8
});
print(trainImage);

// 80% TRAINING DATA AND 20% VALIDATION DATA
var trainingData = trainImage.randomColumn();
var trainSet = trainingData.filter(ee.Filter.lessThan('random', 0.8));
var validSet = trainingData.filter(ee.Filter.greaterThanOrEquals('random', 0.8));

var classifier = ee.Classifier.smileRandomForest().train(trainSet, label, bands);
var classified = input.classify(classifier);
print(classified);

var landCoverPalette = [
  '#093BBA', // Ocean Color (0)
  '#D2D4C3', // UrbanArea Color (1)
  '#2F8A42', // Vegetation Color (2)
  "#573C05", // OtherLand Color (3)
  '#4790BA', // WaterBodies Color (4)
  ];
  
Map.addLayer(classified, {palette: landCoverPalette, min: 0, max: 4}, 'classification');

var confusionMatrix = ee.ConfusionMatrix(validSet.classify(classifier)
.errorMatrix({
  actual: 'Class',
  predicted: 'classification'
}));

print('Confusion Matrix: ', confusionMatrix);
print('Overall Accuracy: ', confusionMatrix.accuracy());
// print('Producers Accuracy: ', confusionMatrix.producersAccuracy());
// print('Consumers Accuracy: ', confusionMatrix.consumersAccuracy());

// Export.image.toDrive({
//   image: classified,
//   description: 'LANDSAT-RF100-UVWOB',
//   scale: 30,
//   region: roi,
//   maxPixels: 1e13
// });
