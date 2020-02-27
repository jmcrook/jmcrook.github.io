<?php
if(!isset($_POST['submit']))
{
	//This page should not be accessed directly. Need to submit the form.
	echo "error; you need to submit the form!";
}
$full_name = $_POST['full-name'];
$employer = $_POST['employer'];
$email = $_POST['email'];
$venmo_id = $_POST['venmo-id'];
$address_line1 = $_POST['address-line1'];
$address_line2 = $_POST['address-line2'];
$city = $_POST['city'];
$region = $_POST['region'];
$postal_code = $_POST['postal-code'];
$quantity = $_POST['quantity'];
$pillow = $_POST['withPillow'];

//Validate first
if(empty($name)||empty($email))||empty($employer)
{
    echo "Name, email and employer are mandatory!";
    exit;
}

if(IsInjected($visitor_email))
{
    echo "Bad email value!";
    exit;
}

$email_from = 'jmcrook95@gmail.com';//<== update the email address
$email_subject = "New Order";
$email_body = "name: $full_name"

$to = "jmcrook95@gmail.com";//<== update the email address
$headers = "From: $email_from \r\n";
$headers .= "Reply-To: $email \r\n";
//Send the email!
mail($to,$email_subject,$email_body,$headers);
//done. redirect to thank-you page.
header('Location: index.html');


// Function to validate against any email injection attempts
function IsInjected($str)
{
  $injections = array('(\n+)',
              '(\r+)',
              '(\t+)',
              '(%0A+)',
              '(%0D+)',
              '(%08+)',
              '(%09+)'
              );
  $inject = join('|', $injections);
  $inject = "/$inject/i";
  if(preg_match($inject,$str))
    {
    return true;
  }
  else
    {
    return false;
  }
}

?>
