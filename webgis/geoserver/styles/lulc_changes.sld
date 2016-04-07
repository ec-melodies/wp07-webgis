<?xml version="1.0" encoding="ISO-8859-1"?>
<StyledLayerDescriptor version="1.0.0"
                       xmlns="http://www.opengis.net/sld" xmlns:ogc="http://www.opengis.net/ogc"
                       xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                       xsi:schemaLocation="http://www.opengis.net/sld      http://schemas.opengis.net/sld/1.0.0/StyledLayerDescriptor.xsd">
    <NamedLayer>
        <Name>LULC_CHANGES</Name>
        <UserStyle>
            <FeatureTypeStyle>
                <Rule>
                    <RasterSymbolizer>
                        <ColorMap type="values">
                            <ColorMapEntry color="#000000" quantity="0" label="No data" opacity="0"/>
                            <ColorMapEntry color="#e0bebe" quantity="1" label="Abandoned irrigated agriculture" opacity="1"/>
                            <ColorMapEntry color="#cba67f" quantity="2" label="Abandoned rainfed agriculture" opacity="1"/>
                            <ColorMapEntry color="#ff97be" quantity="3" label="Irrigated agriculture expansion" opacity="1"/>
                            <ColorMapEntry color="#ffaa7f" quantity="4" label="Rainfed agriculture expansion" opacity="1"/>
                            <ColorMapEntry color="#5d5d5d" quantity="5" label="Burnt" opacity="1"/>
                            <ColorMapEntry color="#aa5500" quantity="6" label="Deforestation" opacity="1"/>
                            <ColorMapEntry color="#55aa7f" quantity="7" label="Forest expansion" opacity="1"/>
                            <ColorMapEntry color="#aaaa00" quantity="8" label="Natural vegetation decline" opacity="1"/>
                            <ColorMapEntry color="#aaff7f" quantity="9" label="Natural vegetation growth" opacity="1"/>
                            <ColorMapEntry color="#aa0000" quantity="10" label="Urban growth" opacity="1"/>
                            <ColorMapEntry color="#aaaaff" quantity="11" label="Water level drop" opacity="1"/>
                            <ColorMapEntry color="#00aaff" quantity="12" label="Water level rise" opacity="1"/>
                        </ColorMap>
                    </RasterSymbolizer>
                </Rule>
            </FeatureTypeStyle>
        </UserStyle>
    </NamedLayer>
</StyledLayerDescriptor>
