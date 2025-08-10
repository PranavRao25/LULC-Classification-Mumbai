# LULC-Classification-Mumbai

This Project aims to generate LULC (Land Use Land Cover) Map of Mumbai using Supervised Classification Techniuques. This Project was carried out as part of the Summer Training / Internship program on Remote Sensing and GIS by Indian Space Academy in 2025.

## What is LULC?
LULC (Land Use & Land Cover) maps describes how the land of a region is beign used. Land Use refers to the land utilized by humans while land cover refers to the existing land. These maps are created through Remote Sensing.

## What is Remote Sensing?
Any collection of data done via non-physical means, e.g Satellite Imagery, etc. It primarily works on the reflectance principle - the data read is the reflected part of a transmitted light. I have primarily relied on Satellite Imagery for this project. Satellites have specialised instruments and sensors which usually collect data from the EM spectrum (usually ranging from Radio to UV). These are then processed according to the use case (different materials reflect and/or absorb different wavelengths of light) into the GIS.

## What is GIS?
GIS (Geographical Information System) is ...

## Use cases
1. Study the spread of land and changes across time
2. Provide sample data for further work on the same

## About the Data
We first define our AOI. Then we retrive the data from two satellites - LANDSAT 8 & Sentinel 2A. The timeline was 1st Jan 2025 to 1st May 2025 (chosen to avoid the Monsoon season of Mumbai). The bands that were used for this study are:
1. Landsat 8 - B2, B3, B4, B5, B6, & B7
2. Sentinel 2A - B2, B3, B4, B5, B6, B7, B8, B11, & B12

We also make use for some spectral indices such as NDBI, NDWI, NDVI and SAVI for improving the classification.

### NDBI
The Normalised Difference Built-up indices (NDBI) uses the NIR and SWIR bands to emphasize manufactured built-up areas. It ranges from -1 to 1, higher the index, more the urbanisation. It is calculated as: $NDBI = \frac{(SWIR − NIR)}{(SWIR + NIR)}$

### NDWI
The Normalised Difference Water Index (NDWI) is used to monitor changes related to water content in water bodies, using green and NIR wavelengths. It ranges from -1 to 1 with a hueristical understanding as:
1. NDWI > 0.5 - water bodies
2. NDWI ~ 0.2 - Vegetation and Builtup areas
3. NDWI < 0 - Drought or dry areas

Its formula is:
$NDBI = \frac{(Green − NIR)}{(Green + NIR)}$

### NDVI
The Normalized Difference Vegetation Index (NDVI) is a widely used metric for quantifying the health and density of vegetation using sensor data. It ranges from -1 to 1, with higher values indicating vegetation. Its formula is:
$NDBI = \frac{(NIR - Red)}{(NIR + Red)}$

### SAVI
The Soil Adjusted Vegetation Index (SAVI) is used to correct NDVI for the influence of soil brightness in areas where vegetative cover is low. Its formula is:
$SAVI = \frac{(NIR - Red)(1 + L)}{(NIR + Red + L)}$

## About the Methods
We first create a training data by defining different points on the AOI for each class. In this project we have used a maximum of five classes - Ocean, Water Bodies, Urban Area, Vegetation and Other Land. We calculate the indices from the satellite bands and utilise them in determining the class. We then train a classifier model on the training data and get its evaluation using confusion matrices. We also calcuate the per class area distribution.

## Classification Methods used
1. CART
2. Random Forest

## Findings
1. Landsat 8 and Sentinel 2A are equally good at LULC data collection.
2. Majority of the land is urban.
3. Nearly a third of the area is occupied by the ocean and water bodies.
4. The green cover of the area is 17%.
