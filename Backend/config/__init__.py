# Use PyMySQL as a drop-in replacement for mysqlclient.
# mysqlclient needs a C compiler + MySQL headers to install on Windows;
# PyMySQL is pure Python and installs with a plain `pip install pymysql`.
import pymysql

pymysql.install_as_MySQLdb()
