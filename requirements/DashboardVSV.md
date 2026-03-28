# DashboardVSV

## Introduction
I want to create a modern-looking dashboard using React and Tailwind CSS. 

## Technical Architecture
- Backend is a Oracle database.
- Python is used to query the database and serve the data to the frontend.
- Frontend is a React application.
- Tailwind CSS is used for styling.

## Dashboard Layout

The dashboard should have the following layout:

| Status      | DOM5        |                                                                DOM6        | DOM7        | DOM8        | DOM9        | DOM10       | DOM11       | DOM12       | DOM13       | DOM14       | DOM15       | DOM16       |
| ----------- | ----------- | ----------- | ----------- | ----------- | ----------- | ----------- | ----------- | ----------- | ----------- | ----------- | ----------- | ----------- |
| Afgewezen      | A5       | A6       | A7       | A8       | A9       | A10       | A11       | A12       | A13       | A14       | A15       | A16       |
| Geaccepteerd   | G5        | G6        | G7        | G8        | G9        | G10       | G11       | G12       | G13       | G14       | G15       | G16       |
| Partieel                                                                   Geaccepteerd   | PG5           | PG6           | PG7           | PG8           | PG9           | PG10          | PG11          | PG12          | PG13          | PG14          | PG15          | PG16          |
| Verwerking mislukt   | VM5        | VM6        | VM7        | VM8        | VM9        | VM10       | VM11       | VM12       | VM13       | VM14       | VM15       | VM16       |
| Wordt Verwerkt   | WV5        | WV6        | WV7        | WV8        | WV9        | WV10       | WV11       | WV12       | WV13       | WV14       | WV15       | WV16       |
| Onbekend         | ON5        | ON6        | ON7        | ON8        | ON9        | ON10       | ON11       | ON12       | ON13       | ON14       | ON15       | ON16       |


### Explanation
Each column represents a <mark>domain</mark>, and the rows represent the <mark>status</mark> of the messages in that domain. Each cell contains the number of messages with that status in that domain.

For example, the cell 'A5' contains the number of messages with status 'Afgewezen' in domain 'DOM5'.

The numbers are retrieved from the Oracle database using the following query:

query:

```
SELECT  DECODE(TELLINGEN.STATUS    
              ,-6,   'A'   --'Afgewezen' 
              ,-1,   'VW'  --'Verwerking mislukt'
              , 0,   'WV'  --'Wordt Verwerkt'           
              , 2 ,  'G'   --'Geaccepteerd'             
              , 7 ,  'PG'  -- 'Gedeeltelijk geaccepteerd' --+
              ,      'ON'  -- 'Onbekend: '||TELLINGEN.STATUS 
              )               IOMSTATUS
,        TELLINGEN.AANTAL     AANTAL                 
FROM 
    ( 
    SELECT  IOM.LSTATUS               STATUS
    ,      COUNT(*)                  AANTAL
    FROM DOM5ADMIN.G_IO_ARCHIVE_MAIN IOM
    JOIN DOM5ADMIN.G_IO_ARCHIVE_SUBTYPE IOS
           ON IOS.LID = IOM.LSUBTYPEID
    JOIN DOM5ADMIN.G_IO_ARCHIVE_TYPE IOT
            ON IOT.LID = IOM.LTYPEID 
    WHERE (1=1)
    AND IOS.SSUBTYPENAME = 'SmartReadingsNotification'
    AND IOM.TTIME  > CAST(FROM_TZ(CAST(  TO_DATE('17012025', 'DDMMYYYY')  AS TIMESTAMP), 'CET') AT TIME ZONE 'UTC' AS DATE)
    GROUP BY IOM.LSTATUS
) TELLINGEN
ORDER BY 1
```

For each domain this query is executed, with the only difference that 'DOM5ADMIN' is replaced with 'DOMxADMIN' where x is the domain number. The result is a table with 2 columns: 'IOMSTATUS' and 'AANTAL', for example.

| IOMSTATUS | AANTAL |
|-----------|--------|
| A         | 10     |
| G         | 40     |
| PG        | 50     |
| VW        | 20     |
| WV        | 30     |
| ON        | 0      |

So if the above result was found for DOM5, the cell 'A5' should display '10', 'G5' should display '40', 'PG5' should display '50', 'VW5' should display '20', 'WV5' should display '30', and 'ON5' should display '0'.


## Additional Layout Requirements

- The dashboard should have a title 'DashboardVSV' at the top left.
- If a cell contains the number 0, it should be displayed in black.
- If a cell contains a number > 0, it should be displayed as follows:
    - The numbers in the cells starting with 'A', so 'A5', 'A6', etc. should be displayed in red.
    - The numbers in the cells starting with 'G', so 'G5', 'G6', etc. should be displayed in green.
    - The numbers in the cells starting with 'PG', so 'PG5', 'PG6', etc. should be displayed in red.
    - The numbers in the cells starting with 'VW', so 'VW5', 'VW6', etc. should be displayed in red.
    - The numbers in the cells starting with 'WV', so 'WV5', 'WV6', etc. should be displayed in red.
    - The numbers in the cells starting with 'ON', so 'ON5', 'ON6', etc. should be displayed in red.    
- Font: Choose a font that is easy to read when numbers are shown in red or green.


## Refresh Button
- The dashboard should have a refresh button that refreshes the dashboard. This button has a refresh icon and the text 'Refresh'. It is positioned at the top right of the dashboard.
- When the refresh button is clicked, the dashboard should refresh the dashboard, which means that one by one the above query is executed for each of the domains, starting with DOM5 and ending with DOM16. 
- The refresh button should be disabled while the dashboard is refreshing.
- A database icon should be displayed above the column header, indicating that the data is from a database for that particular domain. This icon should be invisilble when the domain's query is *not* running
- The refresh button should be enabled after all domains in the dashboard have been refreshed.
- Below the refresh button, the last refresh time should be displayed. This should be in the format 'Last refresh: HH:MM:SS'. This should be updated every time the dashboard is refreshed. Initially this field is empty (i.e. show a dash '-').

## Oracle Backend
*   **Database Adapter:** Use **python-oracledb** (v2+). 
*   **Secure bind variables:**  Always use *secure bind variables* (like `:variabele`) in Queries to prevent SQL injection. 
*   **Configuratie management:** Use **python-dotenv** for loading `.env` configuration variables. Do not store credentials in the source code.

## Debug mode
The debug mode is a feature that is initiated by a variable in the .env file of the backend:
DEBUG_MODE: ON or OFF, default OFF

When the debug mode is ON, or active, the following happens:
- ALL SQL queries are written to the backend.log file with the following format:
    - Context: A description of why the SQL was executed, e.g. the name of the field that was populated in case of a dynamic dropdown list
    - SQL: The SQL, exactly in the way it was handed over to the database, so with bind parameters included
    - Result: Either 'OK' or 'ERROR'. 
    - Error description: In case the Result was 'ERROR': the error that was returned by the database system.
- If there are fields that are dynamic dropdown fields, so which are filled by an SQL have a 'i' icon behind their labels. This icon contains a tooltip in which the SQL is shown.