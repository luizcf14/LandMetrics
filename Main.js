var table = ee.FeatureCollection("users/luizcf14/simplifiedMunicipalities"),
    biomas = ee.FeatureCollection("users/luizcf14/Caatinga/Biomas"),
    estados = ee.FeatureCollection("users/luizcf14/Caatinga/estados_2010"),
    ecoregioes = ee.FeatureCollection("users/luizcf14/Caatinga/ecorregioes"),
    table2 = ee.FeatureCollection("users/luizcf14/Caatinga/ZEE_sema");

print(table2)

table = table.map(function(feat){
  return feat.set({'categoria':'Municípios'})
})

estados = estados.map(function(feat){
  var nome = feat.get('nome')
  var codigo = feat.get('codigo_ibg')
  return feat.set({'nome':nome,'codigo_ibg':codigo,'categoria':'Estados'})
})
print('Estado MAX:',estados.aggregate_max('codigo_ibg'))
print('Estado MIN:',estados.aggregate_min('codigo_ibg'))

biomas = biomas.map(function(feat){
  var nome = feat.get('Bioma')
  var codigo = feat.get('CD_Bioma')
  return feat.set({'nome':nome,'codigo_ibg':codigo,'categoria':'Biomas'})
})
print('biomas MAX:',biomas.aggregate_max('codigo_ibg'))
print('biomas MIN:',biomas.aggregate_min('codigo_ibg'))

ecoregioes = ecoregioes.map(function(feat){
  var nome = feat.get('NOMPAISA')
  var codigo = ee.Number(feat.get('InPoly_FID')).add(60)
  return feat.set({'nome':nome,'codigo_ibg':codigo,'categoria':'Ecoregioes'})
})

print('EcoRegioes MAX:',ecoregioes.aggregate_max('codigo_ibg'))
print('EcoRegioes MIN:',ecoregioes.aggregate_min('codigo_ibg'))


var homePath = ee.List(ee.data.getAssetRoots()).get(0).getInfo().id

var checkFile = function(fileName){
  var Path = fileName
  var val = 0;
  try {
    var files = ee.data.getInfo(Path)
    if(files !== null){
      val = 1
    }
  }catch(e){
    val = 0
  }
  return val
}
var script1 = function(municipio,ano){
//var anoAvaliado =  1987

var anoAvaliado =  ano
var nomeMunicipio = municipio 

//var nomeMunicipio = 'MORRO DO CHAPÉU' 
var municipios = table.merge(biomas).merge(estados).merge(ecoregioes)
var municipio = municipios.filterMetadata('nome','equals',nomeMunicipio)
 municipio = municipio.map(function(feat){
    return feat.buffer(50).buffer(-50).simplify(1)
  })
var municipioOriginal = municipio.first()
var geocode = municipio.first().get('codigo_ibg').getInfo()

var Path = homePath+'/Caatinga/Caatinga_'+geocode+'_'+anoAvaliado
var files = checkFile(Path)
if(files == 0){
  municipio = ee.Image(0).toByte().paint(municipio,1)
  var maskBiomes = ee.Image('projects/mapbiomas-workspace/AUXILIAR/biomas-estados-2016-raster')
  var colecaoMapbiomas = ee.Image('projects/mapbiomas-workspace/public/collection4/mapbiomas_collection40_integration_v1')
  //var colecaoMapbiomas = ee.ImageCollection('projects/mapbiomas-workspace/COLECAO3_1/integracao-dev').mosaic();
  //colecaoMapbiomas = colecaoMapbiomas.updateMask(maskBiomes.gte(520).and(maskBiomes.lte(529)).and(municipio.eq(1)))
   colecaoMapbiomas = colecaoMapbiomas.updateMask(municipio.eq(1))
  var caatinga = colecaoMapbiomas.select('classification_'+anoAvaliado);
  var vetores = caatinga.toByte().clip(municipioOriginal).reduceToVectorsStreaming({
  		  scale: 30,
  		 	geometryType: 'polygon',
  		 	bestEffort: false,
  		 	maxPixels: 1e13,
  		 	tileScale: 4
  	}).set({'ano':anoAvaliado})
  
  vetores = ee.FeatureCollection(vetores)
  
  //Map.addLayer(municipio,{min:0,max:1},'Municipio')
  Map.addLayer(colecaoMapbiomas,{},'Mapbiomas ')
  Map.addLayer(vetores,{color:'red'},'Pontos')
  
  Export.table.toAsset(ee.FeatureCollection(vetores),'Caatinga_'+geocode+'_'+anoAvaliado,'Caatinga/Caatinga_'+geocode+'_'+anoAvaliado)
  return 1
}else{
  return 0
}
return 0
//Va para o script: https://code.earthengine.google.com/5b866b65e3d8d28fd4b4e9014c8fd814
}

var script2 = function(ano,municipio){
  var anoAvaliado = ano;
  var nomeMunicipio = municipio 
  var municipios = table.merge(biomas).merge(estados).merge(ecoregioes)
  var municipio = municipios.filterMetadata('nome','equals',nomeMunicipio)
  var geocode = municipio.first().get('codigo_ibg').getInfo() 
  municipio = municipio.map(function(feat){
    return feat.buffer(50).buffer(-50).simplify(1)
  })
  var Path = homePath+'/Caatinga/Caatinga_'+geocode+'_'+anoAvaliado
  var files = checkFile(Path)
  if(files == 1){
  var Path2 = homePath+'/Caatinga/Caatinga_Centroids_'+geocode+'_'+anoAvaliado
  var files2 = checkFile(Path2)
  if(files2 == 1){
    return 2
  } 
  var vetor = ee.FeatureCollection(Path).map(function(e){
    var area = e.area(0)
    var perimetro = e.perimeter(1)
    var centroid = e.centroid(1)
    var classe = e.get('label')
    return ee.Feature(centroid.geometry(),{'geocode':geocode,'classe':classe,'area':area,'perimetro':perimetro})
  })
  Map.centerObject(vetor,10)
  Map.addLayer(vetor,{},'Vetores')
  Export.table.toAsset(vetor,'Caatinga_Centroids_'+geocode+'_'+anoAvaliado,'Caatinga/Caatinga_Centroids_'+geocode+'_'+anoAvaliado)
  return 1
  }else{
     print('Arquivo inexistente, processe a etepa 1')
     return 0
  }
}

var script3 = function(ano,municipio){
  var anoAvaliado = ano
  var nomeMunicipio = municipio 
  var municipios = table.merge(biomas).merge(estados).merge(ecoregioes)
  var municipio = municipios.filterMetadata('nome','equals',nomeMunicipio)
  print('Etapa3 - Municipio',municipio)
  var geocode = municipio.first().get('codigo_ibg').getInfo() 
  var Path = homePath+'/Caatinga/Caatinga_Centroids_'+geocode+'_'+anoAvaliado
  var files = checkFile(Path)
  print('Etapa3 - Path',Path)
  if(files == 1){
      var centroids = ee.FeatureCollection(Path).filterMetadata('classe','not_equals',0)
      //var totalArea = ee.Numbercentroids.reduceColumns(ee.Reducer.sum(), ['area']).get('sum')
      print(centroids.filterMetadata('classe','equals',ee.Number.parse("12",10)).reduceColumns(ee.Reducer.sum(),['area']).get('sum'))
      var classes = ee.Dictionary(centroids.aggregate_histogram('classe'))
      classes = (classes.keys()).map(function(e){
        var maxPath = centroids.filterMetadata('classe','equals',ee.Number.parse(e,10)).reduceColumns(ee.Reducer.max(),['area']).get('max')
        var totalArea = centroids.reduceColumns(ee.Reducer.sum(), ['area']).get('sum')
        var totalClassArea = centroids.filterMetadata('classe','equals',ee.Number.parse(e,10)).reduceColumns(ee.Reducer.sum(), ['area']).get('sum')
        var totalClassAreaHC = ee.Number(totalClassArea).divide(10000)
        var totalClassAreaKm2 = ee.Number(totalClassArea).divide(1e+6)
        var LPI = ee.Number(maxPath).divide(totalArea).multiply(100)
        var PLAND = ee.Number(totalClassArea).divide(totalArea).multiply(100)
        var ENN = centroids.filterMetadata('classe','equals',ee.Number.parse(e,10)).distance(3000,1).clip(municipio)
        var ENNmin = ENN.reduceRegion(ee.Reducer.min(), municipio.geometry(), 30, null, null, false, 1e13, 1).get('distance')
        var ENNmax = ENN.reduceRegion(ee.Reducer.max(), municipio.geometry(), 30, null, null, false, 1e13, 1).get('distance')
        var ENNmean = ENN.reduceRegion(ee.Reducer.mean(), municipio.geometry(), 30, null, null, false, 1e13, 1).get('distance')
        return ee.Feature(null,{'classId':e,'TCA-(HC)':totalClassAreaHC,'NP':classes.get(e),'LPI':LPI,'PLAND':PLAND,'ENN(max)':ENNmax,'ENN(min)':ENNmin,'ENN(mean)':ENNmean})
      })
    print('Classes Metrics',classes)
    Map.addLayer(centroids)
    Export.table.toDrive(ee.FeatureCollection(classes),'Caatinga_Metrics_'+geocode+'_'+ano,'Caatinga/Caatinga_Metrics_'+geocode+'_'+ano,'CSV')
    return 1
  }
  return 0
}
//IMPORT 
var municipios = table.merge(biomas).merge(estados).merge(ecoregioes)
//GUI
Map.style().set('cursor', 'hand');
 

var asset = "users/rnvuefsppgm/logo_land_metrics";

var aridas = function () {
    var logo = ee.Image(asset).select(['b3', 'b2', 'b1'])
                              .visualize({bands: ['b1', 'b2', 'b3'], min: 0, max: 255});//,  gamma: [1.3, 1.3, 1]
    var thumbnail = ui.Thumbnail({
        image: logo,
        params: {
            dimensions: '360x136',
            format: 'png'
        },
        style: {
            'position': 'top-center',
            'height': '120px',
            'width': '240px',
            'textAlign': 'center'
        }
       
    });
    return thumbnail;
};
 
 
var panel = ui.Panel();
panel.style().set({
    width: '260px',
    position: 'bottom-right',
    border: '0.5px solid #000000',
    backgroundColor: '#f6f6f6'
});

var Logo = aridas();
panel.add(Logo);

var asset1 = "users/rnvuefsppgm/instuticoes_logos_landmetrics";

var aridas1 = function () {
    var logo1 = ee.Image(asset1).select(['b3', 'b2', 'b1'])
                              .visualize({bands: ['b1', 'b2', 'b3'], min: 0, max: 255});//,  gamma: [1.3, 1.3, 1]
    var thumbnail = ui.Thumbnail({
        image: logo1,
        params: {
            dimensions: '360x136',
            format: 'png'
        },
        style: {
            'position': 'bottom-center',
            'height': '170px',
            'width': '240px',
            'textAlign': 'center'
        }
       
    });
    return thumbnail;
};

var Logo1 = aridas1();
panel.add(Logo1);

var Header = ui.Label('Analise da Paisagem - Toolkit', { fontWeight: 'bold', fontSize: '20px', textAlign: 'center', backgroundColor: '#f6f6f6' });
var label_year_select = ui.Label('Selecione o Ano', { fontWeight: 'bold', backgroundColor: '#f6f6f6' });
var year_select = ui.Select({
    items: [
      { label: '1985', value: '1985' },
      { label: '1986', value: '1986' },
      { label: '1987', value: '1987' },    
      { label: '1988', value: '1988' },
      { label: '1989', value: '1989' },    
      { label: '1990', value: '1990' },    
      { label: '1991', value: '1991' },
      { label: '1992', value: '1992' },
      { label: '1993', value: '1993' },
      { label: '1994', value: '1994' },
      { label: '1995', value: '1995' },
      { label: '1996', value: '1996' },
      { label: '1997', value: '1997' },
      { label: '1998', value: '1998' },
      { label: '1999', value: '1999' },
      { label: '2000', value: '2000' },
      { label: '2001', value: '2001' },
      { label: '2002', value: '2002' },
      { label: '2003', value: '2003' },
      { label: '2004', value: '2004' },
      { label: '2005', value: '2005' },
      { label: '2006', value: '2006' },
      { label: '2007', value: '2007' },
      { label: '2008', value: '2008' },
      { label: '2009', value: '2009' },
      { label: '2010', value: '2010' },
      { label: '2011', value: '2011' },
      { label: '2012', value: '2012' },
      { label: '2013', value: '2013' },  
      { label: '2014', value: '2014' },
      { label: '2015', value: '2015' },
      { label: '2016', value: '2016' },
      { label: '2017', value: '2017' },
      { label: '2018', value: '2018' },
    ],
    value: '2018',
    style: { width: '95%' }
});
var municipiosNomes = municipios.aggregate_array('nome')
var listaMunicipios = ee.List(municipiosNomes).sort().map(function(e){
  return {label:e,value:e}
})


var label_municipio_select = ui.Label('Territorio:', {fontWeight: 'bold', backgroundColor: '#f6f6f6' });
var municipio_select = ui.Select({
    items: listaMunicipios.getInfo(),
    placeholder: 'Municipio',
    style: { width: '95%' },
    onChange: function(obj){
       var munic =municipios.filterMetadata('nome','equals',obj)
        munic = munic.map(function(feat){
          return feat.simplify(1)
        })
       Map.layers().reset()
       Map.addLayer(munic,{color:'FF0000FF'},'Municipios - '+obj)
       Map.centerObject(munic)
    }
});


var label_categoria_select = ui.Label('Categoria:', {fontWeight: 'bold', backgroundColor: '#f6f6f6' });
var categoria_select = ui.Select({
    items: ['Municípios','Biomas','Estados','Ecoregioes','Bacias'],
    placeholder: 'Municípios',
    style: { width: '95%' },
    onChange: function(obj){
      panel.remove(municipio_select)
      var municipiosNomes_cat = municipios.filterMetadata('categoria','equals',obj).aggregate_array('nome')
      var listaMunicipios_cat = ee.List(municipiosNomes_cat).sort().map(function(e){
          return {label:e,value:e}
      })
      municipio_select = ui.Select({
        items: listaMunicipios_cat.getInfo(),
        placeholder: 'Municipio',
        style: { width: '95%' },
        onChange: function(obj){
          var munic =municipios.filterMetadata('nome','equals',obj)
          munic = munic.map(function(feat){
             return feat.simplify(1)
          })
          Map.layers().reset()
          Map.addLayer(munic,{color:'FF0000FF'},'Municipios - '+obj)
          Map.centerObject(munic)
        }
     
    })
      print(panel.widgets())
       panel.insert(8,municipio_select)
    }
  })


var label_etapa_select = ui.Label('Etapa de Processamento:', { fontWeight: 'bold', backgroundColor: '#f6f6f6' });
var etapa_select = ui.Select({
    items: [{label:'Etapa 1 - Vetorizacao',value:1},{label:'Etapa 2 - Extraçao de Atributos',value:2},{label:'Etapa 3 - Calculo de Metricas',value:3}],
    placeholder: 'Etapa',
    style: { width: '95%' },
    onChange: function(e){
      if(e == 1){
        print('Municipio',municipio_select.getValue(),year_select.getValue())
        var status = script1(municipio_select.getValue(),year_select.getValue())
        if(status === 1){
          label_status_select.setValue('Status: Etapa 1, Exporte a Tarefa na Aba "Tasks"')
        }else{
          label_status_select.setValue('Status: A Etapa 1, ja possui asset')
        }
      }
      if(e == 2){
        print('Municipio',municipio_select.getValue(),year_select.getValue())
        var status = script2(year_select.getValue(),municipio_select.getValue())
        if(status === 1){
          label_status_select.setValue('Status: Etapa2, Exporte a Tarefa na Aba "Tasks"')
        }
        if(status === 2){
          label_status_select.setValue('Status: Etapa2 Processada, vá para Etapa 3"')
        }
        else{
          if(status === 0){
           label_status_select.setValue('Status: A Etapa 2, asset nao encontrado, processe etapa 1')
          }
        }
      }
      if(e == 3){
        print('Municipio',municipio_select.getValue(),year_select.getValue())
        var status = script3(year_select.getValue(),municipio_select.getValue())
        if(status === 1){
          label_status_select.setValue('Status: Etapa 3, Exporte a Tarefa na Aba "Tasks"')
        }else{
          label_status_select.setValue('Status: A Etapa 3, asset nao encontrado, processe etapa 2')
        }
      } 
    }
});
var label_status_select = ui.Label('Status', { fontWeight: 'bold', backgroundColor: '#f6f6f6' });

//PANEL
panel.add(Header);
panel.add(label_year_select);
panel.add(year_select);
panel.add(label_categoria_select);
panel.add(categoria_select);
panel.add(label_municipio_select);
panel.add(municipio_select);
panel.add(label_etapa_select);
panel.add(etapa_select);
panel.add(label_status_select);
//panel.add(period_select);

ui.root.add(panel);

//Default Layers

var printout = ee.Image(0).mask(0).paint(municipios, "AA0000", 2)
var visgrid = {
"pallette" : "000000",
"opacity": 0.6
}

Map.setCenter(-53.37,-12.25, 5)
Map.addLayer(printout, visgrid, "Limite", true)