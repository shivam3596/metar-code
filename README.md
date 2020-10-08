National Weather Service (METAR) api

*How to run this app:

1- install npm (if not installed on your machine)
2- cd root_of_this_folder
3- RUN npm install
4- RUN npm start
5- Point browser to localhost:8080/metar/ping  -to get pong
6- Point browser to localhost:8080/metar/info?scode=KSGS  -to get live station data(first time) and then from redis cache(for 5 minutes)
7- Point browser to localhost:8080/metar/info?scode=KSGS&nocache=1 -to get live station data and update cache

*Tested on Ubuntu machine

*Assumptions i made while designing the api:

1- Data fetched from National Weather Service will always be in same order.
Example: 2020/10/07 18:53\nKHUL 071853Z AUTO 17006G17KT 10SM FEW044 BKN060 OVC080 17/09 A2937 RMK AO2 SLP947 T01720094\n
