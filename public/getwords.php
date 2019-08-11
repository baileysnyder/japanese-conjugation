<?php
header('Content-type: text/plain; charset=utf-8');

include '../jaconj_mysql_credentials.php';
//include '/home/baileysn/db_credentials/jaconj_mysql_credentials.php';

$mysqli = new mysqli("baileysnyder.com", $username, $password, $database);
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