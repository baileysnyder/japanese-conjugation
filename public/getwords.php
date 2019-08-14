<?php
if (!array_key_exists('HTTP_REFERER', $_SERVER)) {
  die("Why would you do a thing like that?");
}

header('Content-type: text/plain; charset=utf-8');

// local computer set up
include '../jaconj_mysql_credentials.php';
$mysqli = new mysqli("baileysnyder.com", $username, $password, $database);

// server set up
//include '/home/baileysn/db_credentials/jaconj_mysql_credentials.php';
//$mysqli = new mysqli("127.0.0.1", $username, $password, $database);

if ($mysqli->connect_error) {
  die($mysqli->connect_error);
}

$mysqli->set_charset("utf8");

$verbQuery="SELECT kanji, type, eng FROM verbs";

$rows = array();

if ($verbs = $mysqli->query($verbQuery)) {
	while($row = $verbs->fetch_assoc()) {
		$rows[]=$row;
    }
    
    $verbs->free();
}
echo '{"verbs":' . json_encode($rows);


$adjQuery="SELECT kanji, type, eng FROM adjectives";

$adjrows = array();

if ($adjectives = $mysqli->query($adjQuery)) {
	while($row = $adjectives->fetch_assoc()) {
		$adjrows[]=$row;
    }
    
    $adjectives->free();
}
echo ',"adjectives":' . json_encode($adjrows) . "}";
$mysqli->close();
?>