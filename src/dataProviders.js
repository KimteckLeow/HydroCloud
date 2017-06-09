var providerList = {
    'PEGELONLINE': {
        'name': 'PEGELONLINE',
        'idPrefix': 'po',
        'siteURL': 'http://www.pegelonline.wsv.de/webservices/rest-api/v2/stations.json',
        'siteType': 'json',
        'siteParse': processPegelStations,
        'dischargeURL': dischargePegelUrl,
        'dischargeType': 'json',
        'dischargeParse': parsePegelDischarge
    },
    'USGS-DV': {
        'name': 'USGS-DV',
        'idPrefix': 'dv',
        'siteURL': 'https://waterservices.usgs.gov/nwis/site/?stateCd=al&siteStatus=active&parameterCd=00060&outputDataTypeCd=dv',
        'siteType': 'text',
        'siteParse': processUsgsStations,
        'dischargeURL': dischargeUsgsUrl,
        'dischargeType': 'json',
        'dischargeParse': parseUsgsDischarge
    },
    'USGS-IV': {
        'name': 'USGS-IV',
        'idPrefix': 'iv',
        'siteURL': 'https://waterservices.usgs.gov/nwis/site/?stateCd=al&siteStatus=active&parameterCd=00060&outputDataTypeCd=iv',
        'siteType': 'text',
        'siteParse': processUsgsStations,
        'dischargeURL': dischargeUsgsUrl,
        'dischargeType': 'json',
        'dischargeParse': parseUsgsDischarge
    }
};

function processPegelStations(input) {
    var outJSON = [];
    var csvHeader = 'data:text/csv;charset=utf-8,';
    var outCSV = csvHeader + 'Source,STAID,STANAME,DRAIN_SQKM,HUC02,LAT_GAGE,LNG_GAGE\n';
    input.forEach(function(station, index, array) {
        var tempJSON = {};
        tempJSON['Source'] = 'PEGELONLINE';
        tempJSON['STAID'] = station['number'];
        tempJSON['STANAME'] = station['water']['longname'] + ' at ' + station['longname'];
        tempJSON['LAT_GAGE'] = station['latitude'];
        tempJSON['LNG_GAGE'] = station['longitude'];

        outJSON.push(tempJSON);

        outCSV += 'PEGELONLINE,' + station['number'] + ',' + station['water']['longname'] + ' at ' + station['longname'] + ',null,null,' + station['latitude'] + ',' + station['longitude'] + '\n';
    });
    //console.dir(outJSON);
    return outCSV;
}

function dischargePegelUrl(site, options) {
    var url = 'http://www.pegelonline.wsv.de/webservices/rest-api/v2/stations/' + site + '/W/measurements.json?start=P30D';
    return url;
}

function dischargeUsgsUrl(site, options) {
    //strip the dv from the siteID
    var url = 'https://waterservices.usgs.gov/nwis/dv/?format=json&sites=' + site + '&period=P30D&parameterCd=00060';
    return url;
}

function parsePegelDischarge(returnedData) {
    output = [];
    //check for no data or empty set.
    if (returnedData < 1) {
        return output;
    }
    returnedData.forEach(function (d, index, array) {
        output[index] = [];
        output[index][0] = new Date(d.timestamp);
        //Screen out all negative, '', [], NaN, etc, and store as null.
        output[index][1] = Math.max(0, +d.value) || null;
        //TODO: how does PEGELONLINE data indicate bad values?
    });
    return output;
}

function parseUsgsDischarge(returnedData) {
    output = [];
    //process data
    //    check for no data or empty set;
    try {
        var temp = returnedData.value.timeSeries[0].values[0].value;
        temp.forEach(function (d, index, array) {
            //    convert values to dates and numbers
            output[index] = [];
            output[index][0] = new Date(d.dateTime);
            //screen out negative and non-number values; return null instead.
            // 0 || null returns null.
            var Q = Math.max(0, +d.value * 0.0283168)||null;
            //convert cfs to cms.
            output[index][1] = Q;
            //    a more precise way would be to obtain the actual 'noDataValue'
            //    located at: returnedData.value.timeSeries[0].variable.noDataValue
        });
    } catch (error) {
        console.warn("The USGS did not have data for this site.");
        console.log(error);
    } finally {
        return output;
    }
}

function processUsgsStations(input) {
    console.log("processUSGSstations");
    var outCSV = 'TEMP for USGS!';
    //remove header

    //replace tabs with commas

    //remove unwanted columns

    //add csv header and header row
    var csvHeader = 'data:text/csv;charset=utf-8,';
    outCSV = csvHeader + 'Source,STAID,STANAME,DRAIN_SQKM,HUC02,LAT_GAGE,LNG_GAGE\n' + outCSV;
    return outCSV;
}

function getDischarge(siteId, source, options) {
    //Get provider-related materials from the providerList
    var provider = providerList[source];
    //My internal site ID has a 2 letter prefix added to the provider's site ID to prevent confusion when two
    // providers use the same site ID.
    var site = siteId.slice(2);
    //console.log("getDischarge siteId: " + siteId + "site: " + site);
    var url = provider.dischargeURL(site, options);
    var data = [];

    $.ajax({
        url: url,
        dataType: provider.dischargeType,
        error: function (ErrObj, ErrStr) {
            console.warn("error!");
            console.log("Data Source: " + provider.name);
            console.log("Requested URL: " + url);
            console.log("Returned Error Object:");
            console.log(ErrObj);
            console.log("Returned Error String:");
            console.log(ErrStr);
            //This seems to give good messages from USGS and PEGELONLINE:
            console.log(ErrObj.statusText);
            $('.googft-info-window').append( "<p class='bg-warning'>An error occurred when requesting data for this site.</p>" );
        },
        success: function (returnedData, statusMsg, returnedjqXHR) {
            console.log("success!");
            console.log(returnedData);
            console.log(statusMsg);
            console.log(returnedjqXHR);
            data = providerList[source].dischargeParse(returnedData);

        },
        complete: function () {
            console.log('complete!');
            //save the data to localStorage
            //If error, then data = []
            saveData(siteId, data);
            //add data to viewModel.dataArray
            viewModel.dataArray.push(data);

        }
    });

}

function getStations(providerName) {
    var provider = providerList[providerName];
    console.log("Get station list from " + provider.name);
    var stationCSV = null;

    $.ajax({
        url: provider.siteURL,
        dataType: provider.siteType,
        error: function (ErrObj, ErrStr) {
            console.warn(provider.name + " returned an error.");
            console.dir(ErrObj);
            window.alert(provider.name + " returned an error.\n" + ErrObj.statusText);
        },
        success: function (returnedData, statusMsg, returnedjqXHR) {
            console.log("Success!");

            stationCSV = provider.siteParse(returnedData);

        },
        complete: function () {
            console.log("complete");
            downloadCSV({ filename: provider.name + "-stations.csv", csv: stationCSV });
        }

    });
}
