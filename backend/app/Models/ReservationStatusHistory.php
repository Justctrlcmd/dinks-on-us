<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['reservation_id', 'from_status', 'to_status', 'reason', 'changed_by_user_id'])]
class ReservationStatusHistory extends Model {}
