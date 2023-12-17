from kivy.app import App
from kivy.uix.boxlayout import BoxLayout
from kivy.uix.label import Label
from kivy.uix.button import Button
from kivy.uix.textinput import TextInput
from kivy.uix.spinner import Spinner
from kivy.uix.screenmanager import ScreenManager, Screen
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import date
import smtplib
from kivy.uix.popup import Popup
from kivy.uix.image import Image
from kivy.clock import Clock
from sqlalchemy import create_engine, Column, String, Integer
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

class MyApp(App):
    def build(self):
        self.title = 'Leave Application'

        layout = BoxLayout(orientation='vertical', spacing=10, padding=10)

        self.username_label = Label(text='Username:', font_size='20sp', color=(1, 0, 0, 1))
        self.username_input = TextInput(multiline=False)

        self.leavetype_label = Label(text='Leave Type:')
        self.leavetype_spinner = Spinner(text='Leave Type',
                                         values=['Annual Leave', 'Leave Plan', 'Sick Leave'])

        self.date_label = Label(text='Date:')
        self.day_spinner = Spinner(text='Day', values=[str(i) for i in range(1, 32)])

        self.month_spinner = Spinner(text='Month',
                                     values=['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
                                             'September', 'October', 'November', 'December'])
        self.year_spinner = Spinner(text='Year', values=[str(i) for i in range(2023, 2024)])

        self.send_button = Button(text='Send Email', on_press=self.show_loading_popup)


        layout.add_widget(self.username_label)
        layout.add_widget(self.username_input)
        layout.add_widget(self.leavetype_label)
        layout.add_widget(self.leavetype_spinner)
        layout.add_widget(self.date_label)
        layout.add_widget(self.day_spinner)
        layout.add_widget(self.month_spinner)
        layout.add_widget(self.year_spinner)
        layout.add_widget(self.send_button)

        return layout

    def show_loading_popup(self, instance):
        # Create a loading popup
        content = BoxLayout(orientation='vertical', spacing=10)
        content.add_widget(Label(text="Sending email..."))
        self.popup = Popup(title="Please wait",
                           content=content,
                           size_hint=(None, None),
                           size=(200, 100),
                           auto_dismiss=False)

        # Open the loading popup
        self.popup.open()

        # Schedule the email sending process after a delay
        Clock.schedule_once(self.send_email, 2)

    def send_email(self, dt):
        sender_email = 'inkl0509@gmail.com'
        sender_password = 'mdjy xsyh hgth vhrz'
        recipient_email = 'iirufan@gmail.com'
        today = date.today()
        subject = 'Leave Application'
        body = f'Date: {today.day} {today.month} {today.year}\nUsername:{self.username_input.text}\nLeave Type:{self.leavetype_spinner.text}\nDate: {self.day_spinner.text} {self.month_spinner.text} {self.year_spinner.text}'

        message = MIMEMultipart()
        message['From'] = sender_email
        message['To'] = recipient_email
        message['Subject'] = subject
        message.attach(MIMEText(body, 'plain'))

        try:
            with smtplib.SMTP('smtp.gmail.com', 587) as server:
                server.starttls()
                server.login(sender_email, sender_password)
                text = message.as_string()
                server.sendmail(sender_email, recipient_email, text)
                server.quit()
                print('Email sent successfully!')
        except Exception as e:
            print(f'Error: {e}')
        finally:
            # Close the loading popup
            self.popup.dismiss()

if __name__ == '__main__':
    MyApp().run()