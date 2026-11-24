from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('attendance_api', '0002_attendanceentry'),
    ]

    operations = [
        migrations.AddField(
            model_name='leaverequest',
            name='is_paid',
            field=models.BooleanField(default=True),
        ),
    ]
