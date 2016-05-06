/*********************************************************
function name: Declare Variables Function
description: declare all references needed
**********************************************************/

var express = require('express');
  	oracledb = require('oracledb');
    oracledb.maxRows = 4000;
    searchKeyword = "";
    searchAttribute = "";
    adv_sql = "";
    adv_tag_sql = "";
    artistClicked = "";
    page = 20;

var app = express();
app.use(express.static('public'));

/*********************************************************
function name: Initialization Function
description: initialize the home page when server started
**********************************************************/

app.get('/', function (req, res) {
  	console.log('Hello World!');
  	res.sendFile(__dirname + '/index.html');
});

app.listen(3000, function () {
 	console.log('Example app listening on port 3000!');
});

process.on('SIGINT',function(){
    process.exit(0);    
});

/*********************************************************
function name: Search Function Response
description: Response to the search buttons on the top
**********************************************************/

app.get('/search', function (req, res) 
{
  res.redirect('./search.html');
  if(req.query.find.length==0 || req.query.field.length==0 ){
    return;
  }
  else{
      searchKeyword = req.query.find;
      searchAttribute = req.query.field;
  }
});

app.get('/getSearchResult', function (req, res) 
{
  if(searchKeyword.length!=0 && searchAttribute.length!=0 ){
    console.log("search for: " +searchKeyword+" by "+searchAttribute);
    //build the query string
    if(searchAttribute == "genreName"){
      sentence = "SELECT TITLE AS SONG, RELEASE AS ALBUM, ARTIST_NAME AS MUSICIAN FROM MUSICTRACK " +
                 "WHERE ARTIST_ID IN ( " +
                 "SELECT DISTINCT ARTIST_ID FROM " + 
                 "(SELECT DISTINCT MUSICTRACK.ARTIST_ID FROM HAS_TABLE H, MUSICTRACK WHERE REGEXP_LIKE(H.TAGNAME, '" + 
                  searchKeyword + "', 'i') AND MUSICTRACK.ARTIST_ID = H.ARTIST_ID) UNION " +
                  "(SELECT DISTINCT MUSICTRACK.ARTIST_ID FROM OWES_TABLE O, MUSICTRACK WHERE REGEXP_LIKE(O.TAGNAME, '" + 
                  searchKeyword + "', 'i') AND MUSICTRACK.ARTIST_ID = O.ARTIST_ID))";
    }
    else if(searchAttribute == "tagName"){
      sentence = "SELECT TITLE AS SONG, RELEASE AS ALBUM, ARTIST_NAME AS MUSICIAN FROM MUSICTRACK " +
        "WHERE ARTIST_ID IN ( " +
        "SELECT DISTINCT ARTIST_ID FROM " + 
        "(SELECT DISTINCT MUSICTRACK.ARTIST_ID FROM HAS_TABLE H, MUSICTRACK WHERE REGEXP_LIKE(H.TAGNAME, '" + 
          searchKeyword + "', 'i') AND MUSICTRACK.ARTIST_ID = H.ARTIST_ID) UNION " +
        "(SELECT DISTINCT MUSICTRACK.ARTIST_ID FROM OWES_TABLE O, MUSICTRACK WHERE REGEXP_LIKE(O.TAGNAME, '" + 
          searchKeyword + "', 'i') AND MUSICTRACK.ARTIST_ID = O.ARTIST_ID))";
    }
    else{
      sentence = "SELECT TITLE AS SONG, RELEASE AS ALBUM, ARTIST_NAME AS MUSICIAN FROM MUSICTRACK "+
                 "WHERE REGEXP_LIKE(" + searchAttribute +
                 ", '" + searchKeyword + "', 'i')";
    }

    //connect to oracle database
    data = connectOracle(sentence,res,SendDataCallback);
    searchKeyword = "";
    searchAttribute = "";
  }
  else{
    res.send("Sorry, you haven't enter any keyword.");
  }
});

/*********************************************************
function name: multiple filter search function
description: method to deal with the multiple filter search
input: request and query keywords
output: adv.html
modify date: 04/17/2016
author:xiaohan
**********************************************************/
app.get('/advanced', function (req, res) 
    {
      console.log("redirect!!!!!!!");
      res.redirect('./advres.html');
      if(req.query.artist.length==0 && req.query.song.length==0 && req.query.album.length == 0 && req.query.relyear.length == 0 && req.query.tag.length == 0){
        console.log(req.query.tag);
        console.log("woops!");
        return;
      }
      var isTag = false;
      if(req.query.tag.length != 0){
        isTag = true;
        adv_tag_sql = "SELECT DISTINCT ARTIST_ID FROM " + 
              "(SELECT DISTINCT ARTIST_ID FROM HAS_TABLE H WHERE REGEXP_LIKE(H.TAGNAME, '" + req.query.tag + "', 'i') ) UNION " +
        "(SELECT DISTINCT ARTIST_ID FROM OWES_TABLE O WHERE REGEXP_LIKE(O.TAGNAME, '" + req.query.tag + "', 'i') )";
        console.log("we have tag!");
        console.log(adv_tag_sql);
      }
      if(isTag == false){
        console.log("no tag! glue~");
        var isvalid = false;
        var containAnd = true;
        adv_sql = "SELECT TITLE AS SONG, RELEASE AS ALBUM, ARTIST_NAME AS MUSICIAN FROM MUSICTRACK WHERE";
        if(req.query.artist.length != 0){
          var and = "";
          if(containAnd == false){
            and = " AND ";
          }else{
            containAnd = false;
          }
          adv_sql = adv_sql + and +
          " REGEXP_LIKE(ARTIST_NAME, '" + req.query.artist + "', 'i')";
          isValid = true;
          }
        if(req.query.song.length != 0){
          var and = "";
          if(containAnd == false){
            and = " AND ";
          }else{
            containAnd = false;
          }
          adv_sql = adv_sql + and + " REGEXP_LIKE(TITLE, '" + req.query.song + "', 'i')";
          isValid = true;
        }
        if(req.query.album.length != 0){
          var and = "";
          if(containAnd == false){
            and = " AND ";
          }else{
            containAnd = false;
          }
          adv_sql = adv_sql + and + " REGEXP_LIKE(RELEASE, '" + req.query.album + "', 'i')";
          isValid = true;
        }
        if(req.query.relyear.length != 0){
          var and = "";
          if(containAnd == false){
            and = " AND ";
          }else{
            containAnd = false;
          }
          adv_sql = adv_sql + and + " YEAR = " + req.query.relyear + "  ";
          isValid = true;
        }
        if(isValid == false){
          adv_sql = "";
        }
      }else{
        console.log("we have tag!");
        adv_sql = "SELECT TITLE AS SONG, RELEASE AS ALBUM, ARTIST_NAME AS MUSICIAN FROM MUSICTRACK "+
        "WHERE ARTIST_ID IN ( " + adv_tag_sql +" )";
        if(req.query.artist.length != 0){
          adv_sql = adv_sql + " AND REGEXP_LIKE(ARTIST_NAME, '" + req.query.artist + "', 'i')";
          }
        if(req.query.song.length != 0){
          adv_sql = adv_sql + " AND REGEXP_LIKE(TITLE, '" + req.query.song + "', 'i')";
        }
        if(req.query.album.length != 0){
          adv_sql = adv_sql + " AND REGEXP_LIKE(RELEASE, '" + req.query.album + "', 'i')";
        }
        if(req.query.relyear.length != 0){
          adv_sql = adv_sql + " AND YEAR = " + req.query.relyear + "  ";
        }
        console.log(adv_sql);
      }
      if(adv_sql.length == 0){
        adv_tag_sql = "";
        return;
      }
      adv_tag_sql = "";
    });

app.get('/getAdvRes', function (req, res) 
    {
      if(adv_sql.length != 0 ){
        console.log("search for: " +adv_sql);
        //connect to oracle database
        data = connectOracle(adv_sql,res,SendDataCallback);
        adv_sql = "";
        adv_tag_sql = "";
      }
      else{
        res.send("Sorry, you haven't enter any keyword.");
      }
    });


/*********************************************************
function name: Artist Detail Function Response
description: 
**********************************************************/

app.get('/artistDetailRedirect', function (req, res) 
{ 
    res.redirect('./artistdetail.html');
    artistClicked = req.query.artistName;
    console.log(artistClicked + " clicked!");
});

app.get('/artistDetail', function (req, res) 
{ 
  console.log("get artistDetail request.");
  //build the query string
  sentence = "SELECT TITLE AS SONG_NAME, RELEASE AS ALBUM, ARTIST_NAME AS MUSICIAN, FLOOR(DURATION/60) AS DURATION_MINUTE, " + 
              "FLOOR((DURATION/60 - FLOOR(DURATION/60))*60) AS DURATION_SECOND, YEAR AS RELEASE_YEAR " + 
              "FROM MUSICTRACK WHERE REGEXP_LIKE(ARTIST_NAME, '" + artistClicked + "', 'i')";
  //connect to oracle database
  data = connectOracle(sentence,res,SendDataCallback);
});

app.get('/recommendation', function (req, res) 
{ 
  console.log("get recommendation request.");
  //build the query string
  sentence = "SELECT TAR_NAME AS MUSICIAN, SIMI_NAME AS RECOMMENDATION, TITLE AS SONG_NAME, RELEASE AS ALBUM FROM MUSICTRACK, " +
        "( SELECT DISTINCT SIMI.SIMI_NAME, M.ARTIST_NAME AS TAR_NAME, SIMI.SIMI_ID FROM " +
      "( SELECT DISTINCT ARTIST_NAME AS SIMI_NAME, SIMILARITY.SIMILAR_ARTIST_ID AS SIMI_ID, SIMILARITY.TARGET_ARTIST_ID AS TAR_ID " +
      "FROM MUSICTRACK, SIMILARITY WHERE MUSICTRACK.ARTIST_ID = SIMILARITY.SIMILAR_ARTIST_ID AND SIMILARITY.TARGET_ARTIST_ID IN ( " +
      "SELECT DISTINCT ARTIST_ID FROM MUSICTRACK WHERE REGEXP_LIKE(ARTIST_NAME, '" + artistClicked +
       "', 'i'))) SIMI, MUSICTRACK M WHERE M.ARTIST_ID = SIMI.TAR_ID ) TMP WHERE TMP.SIMI_ID = MUSICTRACK.ARTIST_ID";
  //connect to oracle database
  data = connectOracle(sentence,res,SendDataCallback);
});


/*********************************************************
function name: Find All Function Response
description: Response to the query buttons
**********************************************************/

app.get('/allArtists', function (req, res) 
{
  console.log("get allArtists request.");
  //build the query string
  sentence = "SELECT M.ARTIST_NAME AS MUSICIAN, M.TITLE AS SONG, M.RELEASE AS ALBUM, " +
  "ROUND(M.ARTIST_FAMILIARITY, 2)*100 AS POPULAR_INDEX, ROUND(M.ARTIST_HOTNESS, 2)*100 AS HOT_MARK " +
  "FROM MUSICTRACK M WHERE ROWNUM <= 20";
   page = 20;
  //connect to oracle database
  data = connectOracle(sentence,res,SendDataWithNextButtonCallback);
});

app.get('/nextAllArtists', function (req, res) 
{
  console.log("get nextAllArtists request.");
  var temp = page;
  page += 20;
  //build the query string
  sentence = "SELECT MUSICIAN, SONG, ALBUM, POPULAR_INDEX, HOT_MARK FROM (" +
  "SELECT ROWNUM RNUM, M.ARTIST_NAME AS MUSICIAN, M.TITLE AS SONG, M.RELEASE AS ALBUM, " +
  "ROUND(M.ARTIST_FAMILIARITY, 2)*100 AS POPULAR_INDEX, ROUND(M.ARTIST_HOTNESS, 2)*100 AS HOT_MARK " +
  "FROM MUSICTRACK M) WHERE RNUM > "+temp+" AND RNUM <="+page;
  //connect to oracle database
  data = connectOracle(sentence,res,SendDataWithNextButtonCallback);
});


app.get('/allGenres', function (req, res) 
{
  console.log("get allGenres request.");
  //build the query string
  sentence = "select tagname AS ALL_GENRES from ECHONESTTAG where rownum <=20";
  page = 20;
  //connect to oracle database
  data = connectOracle(sentence,res,SendDataWithNextButtonCallback);
});

app.get('/nextAllGenres', function (req, res) 
{
  console.log("get nextAllGenres request.");
  var temp = page;
  page += 20;
  //build the query string
  sentence = "SELECT ALL_GENRES FROM (select rownum as rnum, tagname AS ALL_GENRES from ECHONESTTAG) " + 
              "WHERE RNUM > "+temp+" AND RNUM <="+page;
  //connect to oracle database
  data = connectOracle(sentence,res,SendDataWithNextButtonCallback);
});

app.get('/allTags', function (req, res) 
{
  console.log("get allTags request.");
  //build the query string
  sentence = "select tagname AS ALL_TAGS from MUSICBRAINZTAG where rownum<=20";
  page = 20;
  //connect to oracle database
  data = connectOracle(sentence,res,SendDataWithNextButtonCallback);
});

app.get('/nextAllTags', function (req, res) 
{
  console.log("get nextAllTags request.");
  var temp = page;
  page += 20;
  //build the query string
  sentence = "SELECT ALL_TAGS FROM (select rownum as rnum, tagname AS ALL_TAGS from MUSICBRAINZTAG) " + 
              "WHERE RNUM > "+temp+" AND RNUM <="+page;
  //connect to oracle database
  data = connectOracle(sentence,res,SendDataWithNextButtonCallback);
});

app.get('/trending', function (req, res) 
{
  console.log("get trending request.");
  //build the query string
  sentence = "SELECT SONG_NAME AS SONG, ALBUM, ARTIST_NAME AS MUSICIAN FROM ( "+
             "SELECT SYS.DBMS_RANDOM.VALUE, TITLE AS SONG_NAME, RELEASE AS ALBUM, "+
             "ARTIST_NAME, ARTIST_HOTNESS, ARTIST_FAMILIARITY FROM MUSICTRACK "+
             "WHERE ARTIST_HOTNESS > 0.45 AND  ARTIST_FAMILIARITY < 0.60 "+
             "ORDER BY SYS.DBMS_RANDOM.VALUE) "+
             "WHERE ROWNUM <= 20";
  //connect to oracle database
  data = connectOracle(sentence,res,SendDataCallback);
});

/*********************************************************
function name: Top 10 Function Response
description: Response to the query buttons
**********************************************************/

app.get('/top10Genres', function (req, res) 
{
	console.log("get top10Genres start.");
  	//build the query string
    sentence = "SELECT tagname AS TOP10GENRE FROM( "+
        "select tagname, max(artist_hotness) from MUSICTRACK join OWES_TABLE "+
        "on MUSICTRACK.ARTIST_ID = OWES_TABLE.ARTIST_ID "+
        "group by tagname order by max(artist_hotness) desc) "+
        "where rownum <= 10";
    //connect to oracle database
  	data = connectOracle(sentence,res,SendDataCallback);
});

app.get('/top10Artists', function (req, res){
	console.log("get top10Artists start.");
  	//build the query string
    sentence = "select artist_name AS Top10Artists from " + 
        "(select artist_name, max(ARTIST_FAMILIARITY) as familiar from MUSICTRACK join "+
        "(select artist_id as newID, minNameLen from "+
        "(select ARTIST_ID, max(ARTIST_FAMILIARITY) as maxFamiliar, min(length(artist_name)) as minNameLen "+
        "from musictrack group by ARTIST_ID order by maxFamiliar desc) where rownum <=10) "+ 
        "on MUSICTRACK.artist_id = newID and length(artist_name) = minNameLen "+
        "group by artist_name order by familiar desc)";
    //connect to oracle database
  	data = connectOracle(sentence,res,SendDataCallback);
});

app.get('/top10Songs', function (req, res) 
{
	console.log("get top10Songs start.");
  	//build the query string
  sentence = "select * from ( "+
        "SELECT DISTINCT * FROM ( " +
        "SELECT TITLE AS SONG, RELEASE AS ALBUM, ROUND(ARTIST_HOTNESS, 2) * 100 AS HOT_MARK FROM MUSICTRACK)" +
        "ORDER BY HOT_MARK DESC )" +
        "where rownum <= 10";
  	data = connectOracle(sentence,res,SendDataCallback);
});

app.get('/LatestTracks', function (req, res) 
{
	console.log("get LatestTracks start.");
  	//build the query string
    sentence = "select title AS SONG, release AS ALBUM, year from musictrack join ( "+
        "select track_id as theID, SYS.DBMS_RANDOM.VALUE from ( "+
        "select track_id, year from musictrack where year <> '0' order by year desc) "+
        "where rownum <= 20 order by 2) on musictrack.track_id = theID";
    //connect to oracle database
  	data = connectOracle(sentence,res,SendDataCallback);

});
/*********************************************************
function name: 'Hall of Fame' Function Response
description: Response to the query buttons
**********************************************************/
app.get('/famehall', function (req, res) 
    {
      console.log("get LatestTracks start.");
        //build the query string
        sentence = "SELECT Y1 AS YEAR , NAME1 AS HOTTEST_SINGER_OF_YEAR, ROUND(MAX_HOT, 2)*100 " +
        "AS HOT_MARK, NAME2 AS MOST_POPULAR_OF_YEAR, ROUND(MAX_FA, 2)*100 AS POPULAR_INDEX FROM " +
        "(SELECT DISTINCT Z.YEAR Y1, Z.MAX_HOT, M.NAME AS NAME1 FROM ( " +
        "SELECT MAX(ARTIST_HOTNESS) AS MAX_HOT, YEAR " +
        "FROM MUSICTRACK " +
        "GROUP BY YEAR " +
        "HAVING YEAR != 0 " +
        "ORDER BY YEAR) Z, " +
        "(SELECT DISTINCT ARTIST_NAME AS NAME, ARTIST_HOTNESS AS HOT , ARTIST_ID AS ID FROM MUSICTRACK) M, " +
        "(SELECT MIN(LENGTH(ARTIST_NAME)) AS MINLEN, MUSICTRACK.ARTIST_ID AS ID " +
        "FROM MUSICTRACK " +
        "GROUP BY MUSICTRACK.ARTIST_ID) LEN " + 
        "WHERE M.HOT = Z.MAX_HOT AND LEN.MINLEN = LENGTH(M.NAME) AND LEN.ID = M.ID " +
        "ORDER BY YEAR DESC " +
        ") INNER JOIN ( " +
        "SELECT DISTINCT Z.YEAR Y2, Z.MAX_FA, M.NAME AS NAME2 FROM ( " +
        "SELECT MAX(ARTIST_FAMILIARITY) AS MAX_FA, YEAR  " +
        "FROM MUSICTRACK " +
        "GROUP BY YEAR " +
        "HAVING YEAR != 0 " +
        "ORDER BY YEAR) Z,  " +
        "(SELECT DISTINCT ARTIST_NAME AS NAME, ARTIST_FAMILIARITY AS FA , ARTIST_ID AS ID FROM MUSICTRACK) M, " +
        "(SELECT MIN(LENGTH(ARTIST_NAME)) AS MINLEN, MUSICTRACK.ARTIST_ID AS ID " +
        "FROM MUSICTRACK " +
        "GROUP BY MUSICTRACK.ARTIST_ID) LEN " +
        "WHERE M.FA = Z.MAX_FA AND LEN.MINLEN = LENGTH(M.NAME) AND LEN.ID = M.ID " +
        "ORDER BY YEAR DESC) " +
        "ON Y1 = Y2 " ;
        //connect to oracle database
        data = connectOracle(sentence,res,SendDataCallback);

    });


app.get('/mostProd', function (req, res) 
    {
      console.log("get LatestTracks start.");
        //build the query string
        sentence = "SELECT DISTINCT AMOUNT AS ALBUM_IN_TOTAL, MUSICTRACK.ARTIST_NAME AS MUSICIAN FROM ( " +
              "SELECT AID, AMOUNT, MIN(STR_LEN) MIN_LEN FROM ( "+
              "SELECT DISTINCT AID, AMOUNT, ARTIST_NAME , length(MUSICTRACK.ARTIST_NAME) AS STR_LEN FROM MUSICTRACK, ( " +
              "SELECT COUNT(TRACK_ID) AS AMOUNT, ARTIST_ID AS AID FROM MUSICTRACK " +
              "GROUP BY ARTIST_ID) " +
              "WHERE AID = MUSICTRACK.ARTIST_ID) " +
              "GROUP BY AID, AMOUNT), MUSICTRACK " +
              "WHERE MUSICTRACK.ARTIST_ID = AID AND length(MUSICTRACK.ARTIST_NAME) = MIN_LEN AND AMOUNT >= 8 " +
              "ORDER BY AMOUNT DESC";
        //connect to oracle database
        data = connectOracle(sentence,res,SendDataCallback);

    });


/*********************************************************
function name: Oracle Database Connection Helper Function
description: used for connect to the oracle database
**********************************************************/

function SendDataCallback(res,data)
{
  if(data.length == 0){
    data = "Sorry, we can't find the result you want!";
  }
	res.send(data);
  console.log(data);
  console.log("data is sent.");
}

function SendDataWithNextButtonCallback(res,data)
{
  if(data.length == 0){
    data = "Sorry, we can't find the result you want!";
  }
  else{
    data += "<button onclick='next()'>next>></button>";
  }
  res.send(data);
  console.log(data);
  console.log("data is sent.");
}


//connect to database
function connectOracle(query,res,callBack){
	var header = "<tr>";
  var data = "";
	oracledb.getConnection(
		{
          user          : "yunze",
          password      : "database",
          connectString : "oracle.cise.ufl.edu:1521/orcl"
        },
        function(err, connection)
        {
          if (err) {
            console.error(err.message);
            return;
          }
          else console.log("oracledb connection is built.");
          connection.execute(query, 
            function(err, result){
              if (err) {
                console.error(err.message);
                return;
              }

              for (var i=0; i< result.metaData.length; i++){
                header += "<th>"+result.metaData[i].name + "</th>";
              }
                header += "</tr>";
              console.log(header);
              for(var i=0; i<result.rows.length; i++){
                var temp = "";
                for(var j=0; j<result.rows[i].length; j++){
                  if(result.metaData[j].name == 'MUSICIAN' || result.metaData[j].name == 'RECOMMENDATION' ||
                   result.metaData[j].name == 'HOTTEST_SINGER_OF_YEAR' || result.metaData[j].name == 'MOST_POPULAR_OF_YEAR' 
                   ||result.metaData[j].name == 'TOP10ARTISTS'){
                    temp += "<td><form method = 'get' action = '/artistDetailRedirect'><input style = 'color:blue; text-decoration: underline; font-size: 16px;' name = 'artistName' type='submit' value='"+result.rows[i][j]+"'/></form></td>" ;
                  }
                  else{
                    temp += "<td>"+result.rows[i][j]+"</td>" ;
                  }
                }
                data += "<tr>" + temp + "</tr>";
              }
              data = "<table class='table-style-two'>" + header + data +"</table>";
              doRelease(connection);
              callBack(res,data);
              return data;
            });
        });
}

//Release the connection
function doRelease(connection){
	connection.release(
		function(err) {
		    if (err) {
				console.error(err.message);
		    }
		    else console.log("the connection to the orable database is already released.");
		});
}